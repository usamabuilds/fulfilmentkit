import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  type DateRangePreset,
  type ReportComputationOutput,
  type ReportFiltersByKey,
} from '../../orders/reporting/orders-reports.service';

type FinancePhaseAOutput = {
  grossNetSalesByOrderChannelCountry: Array<Record<string, string | number | null>>;
  refundsByOrderDate: Array<Record<string, string | number | null>>;
  feesSummary: Array<Record<string, string | number | null>>;
};

type FinanceEligibilityBlocker = {
  featureKey: 'shopify-tax-jurisdiction-report' | 'shopify-store-credit-liability';
  eligible: false;
  blockerCode:
    | 'requires-shopify-tax-jurisdiction-data'
    | 'requires-store-credit-ledger';
  message: string;
};

type FinancePhaseBOutput = {
  paymentsByMethodGateway: Array<Record<string, string | number | null>>;
  taxJurisdictionReports: Array<Record<string, string | number | null>>;
  giftCardStoreCreditLiabilities: Array<Record<string, string | number | null>>;
  eligibilityBlockers: FinanceEligibilityBlocker[];
};

@Injectable()
export class FinanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  runSalesSummary(filters: ReportFiltersByKey['sales-summary']): ReportComputationOutput {
    return {
      rows: 0,
      chartRows: [],
      summary: `Sales Summary has been superseded by phased finance report runners. Use finance phase runners for ${filters.dateRange}.`,
      caveat:
        'Available runners: runPhaseAFromTables (implemented) and runPhaseBConnectorExpansions (returns explicit eligibility blockers for unsupported Shopify Tax and Store Credit specifics).',
    };
  }

  async runPhaseAFromTables(
    workspaceId: string,
    filters: Pick<ReportFiltersByKey['sales-summary'], 'dateRange' | 'statuses'>,
  ): Promise<FinancePhaseAOutput> {
    const dateFloor = this.resolveDateFloor(filters.dateRange);

    const orders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        createdAt: { gte: dateFloor },
      },
      select: {
        id: true,
        orderNumber: true,
        channel: true,
        subtotal: true,
        tax: true,
        shipping: true,
        total: true,
        currency: true,
        status: true,
        createdAt: true,
        orderedAt: true,
      },
    });

    const scopedOrders = this.applyStatusesFilter(orders, filters.statuses);
    const scopedOrderIds = scopedOrders.map((order) => order.id);

    const refunds =
      scopedOrderIds.length === 0
        ? []
        : await this.prisma.refund.findMany({
            where: {
              workspaceId,
              orderId: { in: scopedOrderIds },
              createdAt: { gte: dateFloor },
            },
            select: {
              orderId: true,
              amount: true,
              currency: true,
              createdAt: true,
            },
          });
    const fees =
      scopedOrderIds.length === 0
        ? []
        : await this.prisma.fee.findMany({
            where: {
              workspaceId,
              orderId: { in: scopedOrderIds },
              createdAt: { gte: dateFloor },
            },
            select: {
              orderId: true,
              type: true,
              amount: true,
              currency: true,
            },
          });

    const refundsByOrderId = new Map<string, typeof refunds>();
    for (const refund of refunds) {
      const bucket = refundsByOrderId.get(refund.orderId) ?? [];
      bucket.push(refund);
      refundsByOrderId.set(refund.orderId, bucket);
    }

    const grossNetSalesByOrderChannelCountry = scopedOrders.map((order) => {
      const grossSales = Number(order.subtotal) + Number(order.tax) + Number(order.shipping);
      const orderRefunds = refundsByOrderId.get(order.id) ?? [];
      const refundTotal = orderRefunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
      const netSales = grossSales - refundTotal;
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        channel: order.channel,
        shipCountryCode: null,
        grossSales: Number(grossSales.toFixed(2)),
        netSales: Number(netSales.toFixed(2)),
        currency: order.currency,
      };
    });

    const refundsByOrderDate = scopedOrders.flatMap((order) =>
      (refundsByOrderId.get(order.id) ?? []).map((refund) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundDate: refund.createdAt.toISOString().slice(0, 10),
        amount: Number(Number(refund.amount).toFixed(2)),
        currency: refund.currency,
      })),
    );

    const feeBuckets = new Map<string, { type: string; currency: string; totalAmount: number; feeRows: number }>();
    for (const order of scopedOrders) {
      for (const fee of fees.filter((entry) => entry.orderId === order.id)) {
        const key = `${fee.type}::${fee.currency}`;
        const bucket = feeBuckets.get(key) ?? { type: fee.type, currency: fee.currency, totalAmount: 0, feeRows: 0 };
        bucket.totalAmount += Number(fee.amount);
        bucket.feeRows += 1;
        feeBuckets.set(key, bucket);
      }
    }

    const feesSummary = Array.from(feeBuckets.values())
      .map((bucket) => ({
        feeType: bucket.type,
        currency: bucket.currency,
        totalFees: Number(bucket.totalAmount.toFixed(2)),
        feeRows: bucket.feeRows,
      }))
      .sort((a, b) => b.totalFees - a.totalFees || a.feeType.localeCompare(b.feeType));

    return {
      grossNetSalesByOrderChannelCountry,
      refundsByOrderDate,
      feesSummary,
    };
  }

  async runPhaseBConnectorExpansions(
    workspaceId: string,
  ): Promise<FinancePhaseBOutput> {
    void workspaceId;
    return {
      paymentsByMethodGateway: [],
      taxJurisdictionReports: [],
      giftCardStoreCreditLiabilities: [],
      eligibilityBlockers: [
        {
          featureKey: 'shopify-tax-jurisdiction-report',
          eligible: false,
          blockerCode: 'requires-shopify-tax-jurisdiction-data',
          message:
            'Shopify tax jurisdiction reporting is blocked because jurisdiction-level Shopify Tax fields are not present in the current connector payloads or database schema.',
        },
        {
          featureKey: 'shopify-store-credit-liability',
          eligible: false,
          blockerCode: 'requires-store-credit-ledger',
          message:
            'Store credit liability reporting is blocked because no store-credit transaction ledger is currently ingested for Shopify connectors.',
        },
      ],
    };
  }

  private resolveDateFloor(dateRange: DateRangePreset): Date {
    const now = new Date();
    const date = new Date(now);
    switch (dateRange) {
      case 'last_7_days':
        date.setUTCDate(now.getUTCDate() - 7);
        return date;
      case 'last_14_days':
        date.setUTCDate(now.getUTCDate() - 14);
        return date;
      case 'last_30_days':
        date.setUTCDate(now.getUTCDate() - 30);
        return date;
      case 'last_90_days':
      default:
        date.setUTCDate(now.getUTCDate() - 90);
        return date;
    }
  }

  private applyStatusesFilter<T extends { status: string }>(
    orders: T[],
    statuses: ReportFiltersByKey['sales-summary']['statuses'],
  ): T[] {
    if (statuses.includes('all')) {
      return orders;
    }

    const normalized = new Set(statuses.map((status) => status.toLowerCase()));
    return orders.filter((order) => normalized.has(order.status.toLowerCase()));
  }
}

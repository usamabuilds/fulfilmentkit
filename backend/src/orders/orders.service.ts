import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

type OrdersListArgs = {
  workspaceId: string;
  from?: Date;
  to?: Date;
  status?: string;
  channel?: string;
  search?: string;
  skip: number;
  take: number;
};

type OrderDetailArgs = {
  workspaceId: string;
  id: string;
};

function toEndOfDayUtc(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

function decimalToString(v: any) {
  // Prisma Decimal serializes to string via toString()
  if (v === null || v === undefined) return '0';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'bigint') return v.toString();
  if (typeof v?.toString === 'function') return v.toString();
  return String(v);
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: OrdersListArgs) {
    const where: any = {
      workspaceId: args.workspaceId,
    };

    if (args.from || args.to) {
      where.orderedAt = {};
      if (args.from) where.orderedAt.gte = args.from;
      if (args.to) where.orderedAt.lte = toEndOfDayUtc(args.to);
    }

    if (args.status) {
      where.status = args.status;
    }

    if (args.channel) {
      where.channel = args.channel;
    }

    if (args.search) {
      where.orderNumber = { contains: args.search, mode: 'insensitive' };
    }

    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip: args.skip,
        take: args.take,
        orderBy: {
          orderedAt: 'desc',
        },
        select: {
          id: true,
          externalRef: true,
          orderNumber: true,
          status: true,
          channel: true,
          orderedAt: true,
          currency: true,
          subtotal: true,
          tax: true,
          shipping: true,
          total: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return { total, items: rows };
  }

  async getById(args: OrderDetailArgs) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: args.id,
        workspaceId: args.workspaceId,
      },
      select: {
        id: true,
        externalRef: true,
        orderNumber: true,
        status: true,
        channel: true,
        orderedAt: true,
        currency: true,
        subtotal: true,
        tax: true,
        shipping: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        items: {
          orderBy: { lineKey: 'asc' },
          select: {
            id: true,
            lineKey: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            total: true,
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const feesAgg = await this.prisma.fee.aggregate({
      where: {
        workspaceId: args.workspaceId,
        orderId: order.id,
      },
      _sum: {
        amount: true,
      },
    });

    const refundsAgg = await this.prisma.refund.aggregate({
      where: {
        workspaceId: args.workspaceId,
        orderId: order.id,
      },
      _sum: {
        amount: true,
      },
    });

    // COGS is not modeled yet, so we return 0 for now but keep the contract stable.
    const cogsTotal = new Prisma.Decimal('0');

    return {
      id: order.id,
      externalRef: order.externalRef,
      orderNumber: order.orderNumber,
      status: order.status,
      channel: order.channel,
      orderedAt: order.orderedAt,
      currency: order.currency,
      subtotal: decimalToString(order.subtotal),
      tax: decimalToString(order.tax),
      shipping: decimalToString(order.shipping),
      total: decimalToString(order.total),
      feesTotal: decimalToString(feesAgg._sum.amount ?? '0'),
      refundsTotal: decimalToString(refundsAgg._sum.amount ?? '0'),
      cogsTotal: decimalToString(cogsTotal),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((it) => ({
        id: it.id,
        lineKey: it.lineKey,
        productId: it.productId,
        sku: it.product?.sku ?? null,
        name: it.product?.name ?? null,
        quantity: it.quantity,
        unitPrice: decimalToString(it.unitPrice),
        total: decimalToString(it.total),
      })),
    };
  }
}

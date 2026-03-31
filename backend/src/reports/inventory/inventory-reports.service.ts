import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { type ReportComputationOutput, type ReportFiltersByKey } from '../../orders/reporting/orders-reports.service';

type AgingBucketKey = '0_30' | '31_60' | '61_90' | '90_plus';

@Injectable()
export class InventoryReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async runInventoryAging(
    workspaceId: string,
    filters: ReportFiltersByKey['inventory-aging'],
  ): Promise<ReportComputationOutput> {
    const { fromInclusive, toInclusive } = this.resolveDateRange(filters.dateRange);
    const prismaWithSnapshot = this.prisma as PrismaService & {
      inventorySnapshot: {
        findMany: (args: unknown) => Promise<
          Array<{
            day: Date;
            onHand: number;
            reserved: number;
            available: number;
            product: { sku: string; name: string };
            location: { code: string };
          }>
        >;
      };
    };

    const snapshots = await prismaWithSnapshot.inventorySnapshot.findMany({
      where: {
        workspaceId,
        day: {
          gte: fromInclusive,
          lte: toInclusive,
        },
      },
      select: {
        day: true,
        onHand: true,
        reserved: true,
        available: true,
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
        location: {
          select: {
            code: true,
          },
        },
      },
      orderBy: [{ day: 'asc' }, { product: { sku: 'asc' } }],
    });

    if (snapshots.length === 0) {
      return {
        rows: 0,
        chartRows: [],
        warnings: ['No inventory snapshots were found in the requested range.'],
        summary: `No inventory snapshots found for ${filters.dateRange}.`,
        metadataEntries: [
          ['coverageStatus', 'missing'],
          ['coverageRequestedFrom', fromInclusive.toISOString().slice(0, 10)],
          ['coverageRequestedTo', toInclusive.toISOString().slice(0, 10)],
        ],
      };
    }

    const earliestSnapshotDay = snapshots[0].day;
    const coverageStartsAfterRequestedRange = earliestSnapshotDay.getTime() > fromInclusive.getTime();
    const effectiveStart = coverageStartsAfterRequestedRange ? earliestSnapshotDay : fromInclusive;
    const monthEndBoundaries = this.buildMonthEndBoundaries(effectiveStart, toInclusive);
    const monthEndBoundarySet = new Set(monthEndBoundaries.map((date) => date.toISOString()));

    const allowedBuckets = this.normalizeAgingBuckets(filters.agingBuckets);
    const skuContainsNeedle = filters.skuContains.trim().toLowerCase();

    const grouped = new Map<
      string,
      {
        calendarBoundary: string;
        agingBucket: AgingBucketKey;
        snapshotAgeDays: number;
        totalOnHand: number;
        totalReserved: number;
        totalAvailable: number;
        skuCount: number;
      }
    >();

    for (const snapshot of snapshots) {
      const boundaryKey = snapshot.day.toISOString();
      if (!monthEndBoundarySet.has(boundaryKey)) {
        continue;
      }
      if (snapshot.onHand < filters.minOnHand) {
        continue;
      }
      if (skuContainsNeedle.length > 0) {
        const haystack = `${snapshot.product.sku} ${snapshot.product.name}`.toLowerCase();
        if (!haystack.includes(skuContainsNeedle)) {
          continue;
        }
      }

      const snapshotAgeDays = this.diffDays(toInclusive, snapshot.day);
      const bucket = this.bucketForSnapshotAge(snapshotAgeDays);
      if (!allowedBuckets.has(bucket)) {
        continue;
      }

      const key = `${boundaryKey}:${bucket}`;
      const existing =
        grouped.get(key) ??
        ({
          calendarBoundary: snapshot.day.toISOString().slice(0, 10),
          agingBucket: bucket,
          snapshotAgeDays,
          totalOnHand: 0,
          totalReserved: 0,
          totalAvailable: 0,
          skuCount: 0,
        } satisfies {
          calendarBoundary: string;
          agingBucket: AgingBucketKey;
          snapshotAgeDays: number;
          totalOnHand: number;
          totalReserved: number;
          totalAvailable: number;
          skuCount: number;
        });

      existing.totalOnHand += snapshot.onHand;
      existing.totalReserved += snapshot.reserved;
      existing.totalAvailable += snapshot.available;
      existing.skuCount += 1;
      grouped.set(key, existing);
    }

    const chartRows = Array.from(grouped.values()).sort((a, b) => {
      if (a.calendarBoundary === b.calendarBoundary) {
        return a.agingBucket.localeCompare(b.agingBucket);
      }
      return a.calendarBoundary.localeCompare(b.calendarBoundary);
    });

    const warnings = coverageStartsAfterRequestedRange
      ? [
          `Partial snapshot coverage: history starts on ${earliestSnapshotDay.toISOString().slice(0, 10)}, after requested start ${fromInclusive.toISOString().slice(0, 10)}.`,
        ]
      : undefined;

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      supportStatusOverride: coverageStartsAfterRequestedRange ? 'partial' : 'supported',
      supportReasonOverride: coverageStartsAfterRequestedRange
        ? 'Snapshot history begins after the requested range start, so early period results are unavailable.'
        : undefined,
      metadataEntries: [
        ['coverageStatus', coverageStartsAfterRequestedRange ? 'partial' : 'complete'],
        ['coverageRequestedFrom', fromInclusive.toISOString().slice(0, 10)],
        ['coverageRequestedTo', toInclusive.toISOString().slice(0, 10)],
        ['coverageActualFrom', earliestSnapshotDay.toISOString().slice(0, 10)],
        ['coverageActualTo', toInclusive.toISOString().slice(0, 10)],
        ['monthEndBoundaryCount', String(monthEndBoundaries.length)],
      ],
      summary:
        chartRows.length === 0
          ? `No inventory-aging month-end rows matched filters for ${filters.dateRange}.`
          : `Inventory aging generated ${chartRows.length} month-end bucket rows for ${filters.dateRange}.`,
    };
  }

  private resolveDateRange(dateRange: ReportFiltersByKey['inventory-aging']['dateRange']): {
    fromInclusive: Date;
    toInclusive: Date;
  } {
    const now = new Date();
    const toInclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daysBackByRange: Record<ReportFiltersByKey['inventory-aging']['dateRange'], number> = {
      last_30_days: 30,
      last_90_days: 90,
    };
    const fromInclusive = new Date(toInclusive);
    fromInclusive.setUTCDate(fromInclusive.getUTCDate() - (daysBackByRange[dateRange] - 1));

    return { fromInclusive, toInclusive };
  }

  private buildMonthEndBoundaries(fromInclusive: Date, toInclusive: Date): Date[] {
    const boundaries: Date[] = [];
    const cursor = new Date(Date.UTC(fromInclusive.getUTCFullYear(), fromInclusive.getUTCMonth(), 1));
    const toBoundary = new Date(Date.UTC(toInclusive.getUTCFullYear(), toInclusive.getUTCMonth(), toInclusive.getUTCDate()));

    while (cursor.getTime() <= toBoundary.getTime()) {
      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
      if (monthEnd.getTime() >= fromInclusive.getTime() && monthEnd.getTime() <= toBoundary.getTime()) {
        boundaries.push(monthEnd);
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const includesToBoundary = boundaries.some((value) => value.getTime() === toBoundary.getTime());
    if (!includesToBoundary) {
      boundaries.push(toBoundary);
    }

    return boundaries;
  }

  private diffDays(later: Date, earlier: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / msPerDay));
  }

  private bucketForSnapshotAge(ageDays: number): AgingBucketKey {
    if (ageDays <= 30) {
      return '0_30';
    }
    if (ageDays <= 60) {
      return '31_60';
    }
    if (ageDays <= 90) {
      return '61_90';
    }
    return '90_plus';
  }

  private normalizeAgingBuckets(
    bucketFilters: ReportFiltersByKey['inventory-aging']['agingBuckets'],
  ): Set<AgingBucketKey> {
    if (bucketFilters.includes('all')) {
      return new Set(['0_30', '31_60', '61_90', '90_plus']);
    }

    return new Set(
      bucketFilters.filter((bucket): bucket is AgingBucketKey =>
        ['0_30', '31_60', '61_90', '90_plus'].includes(bucket),
      ),
    );
  }
}

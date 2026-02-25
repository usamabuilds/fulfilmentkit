import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { PrismaService } from '../common/prisma/prisma.service';
import { validateQuery } from '../common/utils/query-validate';

const computeDailyQuerySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
});

const metricsDailyQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});

function toUtcMidnightFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((v) => Number(v));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function addDaysUtc(dateUtcMidnight: Date, days: number): Date {
  return new Date(dateUtcMidnight.getTime() + days * 24 * 60 * 60 * 1000);
}

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

function ymdFromUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Controller('metrics')
export class MetricsController {
  constructor(
    @InjectQueue('metrics') private readonly metricsQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  // POST /metrics/compute-daily?day=YYYY-MM-DD
  @Post('compute-daily')
  async computeDaily(@Req() req: any, @Query() query: any) {
    const q = validateQuery(computeDailyQuerySchema, query);
    const workspaceId = req.workspaceId as string;

    const dayUtc = q.day ? toUtcMidnightFromYmd(q.day) : todayUtcMidnight();

    const job = await this.metricsQueue.add(
      'metrics:compute_daily_metrics',
      {
        workspaceId,
        dayUtc: dayUtc.toISOString(),
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        workspaceId,
        dayUtc: dayUtc.toISOString(),
      },
    };
  }

  // POST /metrics/compute-sku-daily?day=YYYY-MM-DD
  @Post('compute-sku-daily')
  async computeSkuDaily(@Req() req: any, @Query() query: any) {
    const q = validateQuery(computeDailyQuerySchema, query);
    const workspaceId = req.workspaceId as string;

    const dayUtc = q.day ? toUtcMidnightFromYmd(q.day) : todayUtcMidnight();

    const job = await this.metricsQueue.add(
      'metrics:compute_sku_daily_metrics',
      {
        workspaceId,
        dayUtc: dayUtc.toISOString(),
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        workspaceId,
        dayUtc: dayUtc.toISOString(),
      },
    };
  }

  // GET /metrics/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
  // Returns DailyMetric rows for the workspace (inclusive date range)
  @Get('daily')
  async getDaily(@Req() req: any, @Query() query: any) {
    const q = validateQuery(metricsDailyQuerySchema, query);
    const workspaceId = req.workspaceId as string;

    const fromDay = toUtcMidnightFromYmd(q.from);
    const toDayInclusive = toUtcMidnightFromYmd(q.to);
    const toExclusive = addDaysUtc(toDayInclusive, 1);

    const rows = await this.prisma.dailyMetric.findMany({
      where: {
        workspaceId,
        day: {
          gte: fromDay,
          lt: toExclusive,
        },
      },
      orderBy: { day: 'asc' },
      select: {
        day: true,
        revenue: true,
        orders: true,
        units: true,
        refundsAmount: true,
        feesAmount: true,
        cogsAmount: true,
        grossMarginAmount: true,
        grossMarginPercent: true,
        stockoutsCount: true,
        lowStockCount: true,
      },
    });

    return {
      success: true,
      data: {
        items: rows.map((r) => ({
          day: ymdFromUtcDate(r.day),
          revenue: String(r.revenue),
          orders: r.orders,
          units: r.units,
          refundsAmount: String(r.refundsAmount),
          feesAmount: String(r.feesAmount),
          cogsAmount: String(r.cogsAmount),
          grossMarginAmount: String(r.grossMarginAmount),
          grossMarginPercent: String(r.grossMarginPercent),
          stockoutsCount: r.stockoutsCount,
          lowStockCount: r.lowStockCount,
        })),
        total: rows.length,
        range: { from: q.from, to: q.to },
      },
    };
  }
}

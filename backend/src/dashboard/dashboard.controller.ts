import { Controller, Get, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { DashboardService } from './dashboard.service';
import { validateQuery } from '../common/utils/query-validate';
import { parseDateRange } from '../common/utils/date-range';
import { apiResponse } from '../common/utils/api-response';

const dashboardSummaryQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const dashboardTrendsQuerySchema = z.object({
  metric: z.enum(['revenue', 'orders', 'margin', 'refunds', 'fees']),
  groupBy: z.enum(['day', 'week']).default('day'),
  from: z.string().optional(),
  to: z.string().optional(),
});

const dashboardBreakdownQuerySchema = z.object({
  by: z.enum(['channel', 'country', 'sku']),
  from: z.string().optional(),
  to: z.string().optional(),
});

const dashboardAlertsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const dashboardTopSkusQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.enum(['revenue', 'units', 'refunds', 'margin']).default('revenue'),
});

const dashboardRepeatPurchaseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: z.enum(['day', 'week']).optional(),
});

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async summary(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardSummaryQuerySchema, query);
    const { from, to } = parseDateRange(q);

    const result = await this.dashboardService.summary({
      workspaceId,
      from,
      to,
    });

    return apiResponse(result);
  }

  @Get('trends')
  async trends(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardTrendsQuerySchema, query);
    const { from, to } = parseDateRange(q);

    const result = await this.dashboardService.trends({
      workspaceId,
      metric: q.metric,
      groupBy: q.groupBy,
      from,
      to,
    });

    return apiResponse(result);
  }

  @Get('breakdown')
  async breakdown(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardBreakdownQuerySchema, query);
    const { from, to } = parseDateRange(q);

    const result = await this.dashboardService.breakdown({
      workspaceId,
      by: q.by,
      from,
      to,
    });

    return apiResponse(result);
  }

  @Get('alerts')
  async alerts(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardAlertsQuerySchema, query);
    const { from, to } = parseDateRange(q);

    const result = await this.dashboardService.alerts({
      workspaceId,
      from,
      to,
    });

    return apiResponse(result);
  }

  @Get('top-skus')
  async topSkus(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardTopSkusQuerySchema, query);
    const { from, to } = parseDateRange(q);

    const result = await this.dashboardService.topSkus({
      workspaceId,
      from,
      to,
      limit: q.limit,
      sortBy: q.sortBy,
    });

    return apiResponse(result);
  }

  @Get('repeat-purchase')
  async repeatPurchase(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardRepeatPurchaseQuerySchema, query);
    const { from, to } = parseDateRange(q);

    const result = await this.dashboardService.repeatPurchase({
      workspaceId,
      from,
      to,
      groupBy: q.groupBy,
    });

    return apiResponse(result);
  }
}

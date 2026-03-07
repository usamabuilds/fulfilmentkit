import { Controller, Get, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { DashboardService } from './dashboard.service';
import { validateQuery } from '../common/utils/query-validate';
import { parseDateRange } from '../common/utils/date-range';

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

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async summary(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardSummaryQuerySchema, query);
    const { from, to } = parseDateRange(q);

    return this.dashboardService.summary({
      workspaceId,
      from,
      to,
    });
  }

  @Get('trends')
  async trends(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardTrendsQuerySchema, query);
    const { from, to } = parseDateRange(q);

    return this.dashboardService.trends({
      workspaceId,
      metric: q.metric,
      groupBy: q.groupBy,
      from,
      to,
    });
  }

  @Get('breakdown')
  async breakdown(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardBreakdownQuerySchema, query);
    const { from, to } = parseDateRange(q);

    return this.dashboardService.breakdown({
      workspaceId,
      by: q.by,
      from,
      to,
    });
  }

  @Get('alerts')
  async alerts(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;
    const q = validateQuery(dashboardAlertsQuerySchema, query);
    const { from, to } = parseDateRange(q);

    return this.dashboardService.alerts({
      workspaceId,
      from,
      to,
    });
  }
}

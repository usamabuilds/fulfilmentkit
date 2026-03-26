import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ReportsService } from './reports.service';
import { apiResponse } from '../common/utils/api-response';
import { toListResponse } from '../common/utils/list-response';
import { requireWorkspaceId } from '../common/workspace/workspace.utils';

const RunReportBodySchema = z
  .object({
    filters: z
      .object({
        dateRange: z.string().min(1).optional(),
        region: z.string().min(1).optional(),
        status: z.string().min(1).optional(),
      })
      .optional(),
  })
  .strict();

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async listReports() {
    const items = this.reportsService.listReports();

    return apiResponse(
      toListResponse({
        items,
        total: items.length,
        page: 1,
        pageSize: items.length,
      }),
    );
  }

  @Post(':key/run')
  async runReport(@Req() req: any, @Param('key') key: string, @Body() body: unknown) {
    const workspaceId = requireWorkspaceId(req);
    const parsedBody = RunReportBodySchema.parse(body);

    const run = this.reportsService.runReport({
      workspaceId,
      key,
      filters: parsedBody.filters,
    });

    return apiResponse(run);
  }

  @Get(':key/runs/:runId')
  async getReportRun(@Req() req: any, @Param('key') key: string, @Param('runId') runId: string) {
    const workspaceId = requireWorkspaceId(req);

    const run = this.reportsService.getRun({
      workspaceId,
      key,
      runId,
    });

    return apiResponse(run);
  }
}

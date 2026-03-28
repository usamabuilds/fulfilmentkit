import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { z } from 'zod';
import { OrdersReportsService, type ReportFilterDefinitionMap, type ReportKey } from './orders-reports.service';
import { createReportFiltersSchema } from './report-filter-schema.builder';
import { apiResponse } from '../../common/utils/api-response';
import { toListResponse } from '../../common/utils/list-response';
import { requireWorkspaceId } from '../../common/workspace/workspace.utils';

const reportKeySchema = z.enum(['sales-summary', 'inventory-aging', 'order-fulfillment-health']);

function createFiltersSchema(definitions: ReportFilterDefinitionMap): z.ZodType<Record<string, unknown>> {
  return createReportFiltersSchema(definitions);
}

@Controller('reports')
export class OrdersReportsController {
  constructor(private readonly reportsService: OrdersReportsService) {}

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
    const parsedKey = reportKeySchema.safeParse(key);

    if (!parsedKey.success || !this.reportsService.hasReportKey(parsedKey.data)) {
      throw new BadRequestException('Invalid report key');
    }

    const filtersSchema = createFiltersSchema(this.reportsService.getFilterDefinitionMap(parsedKey.data));
    const runBodySchema = z
      .object({
        filters: filtersSchema.optional(),
      })
      .strict();
    const parsedBody = runBodySchema.parse(body);

    const run = this.reportsService.runReport({
      workspaceId,
      key: parsedKey.data as ReportKey,
      filters: parsedBody.filters,
    });

    return apiResponse(run);
  }

  @Post(':key/export')
  async exportReport(
    @Req() req: any,
    @Res({ passthrough: true }) res: { setHeader: (name: string, value: string) => void },
    @Param('key') key: string,
    @Body() body: unknown,
  ) {
    const workspaceId = requireWorkspaceId(req);
    const parsedKey = reportKeySchema.safeParse(key);

    if (!parsedKey.success || !this.reportsService.hasReportKey(parsedKey.data)) {
      throw new BadRequestException('Invalid report key');
    }

    const filtersSchema = createFiltersSchema(this.reportsService.getFilterDefinitionMap(parsedKey.data));
    const exportBodySchema = z
      .object({
        filters: filtersSchema.optional(),
        formatting: z
          .object({
            reportSheetName: z.string().min(1).max(31).optional(),
            metadataSheetName: z.string().min(1).max(31).optional(),
            includeMetadataSheet: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict();
    const parsedBody = exportBodySchema.parse(body);

    const exported = await this.reportsService.exportReport({
      workspaceId,
      key: parsedKey.data as ReportKey,
      filters: parsedBody.filters,
      formatting: parsedBody.formatting,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.setHeader('Content-Length', String(exported.file.length));
    res.setHeader('X-Report-Run-Id', exported.runId);
    res.setHeader('X-Report-Export-Empty', exported.isEmpty ? 'true' : 'false');
    res.setHeader('X-Report-Export-Message', exported.message);

    return exported.file;
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

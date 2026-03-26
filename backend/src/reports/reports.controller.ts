import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ReportsService, type ReportFilterDefinitionMap, type ReportKey } from './reports.service';
import { apiResponse } from '../common/utils/api-response';
import { toListResponse } from '../common/utils/list-response';
import { requireWorkspaceId } from '../common/workspace/workspace.utils';

const reportKeySchema = z.enum(['sales-summary', 'inventory-aging', 'order-fulfillment-health']);

function createFiltersSchema(definitions: ReportFilterDefinitionMap): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  Object.entries(definitions).forEach(([fieldKey, fieldDefinition]) => {
    if (fieldDefinition.type === 'date-range') {
      shape[fieldKey] = z.enum(fieldDefinition.presets as [string, ...string[]]);
      return;
    }

    if (fieldDefinition.type === 'select') {
      const allowedValues = fieldDefinition.options.map((option) => option.value);
      shape[fieldKey] = z.enum(allowedValues as [string, ...string[]]);
      return;
    }

    if (fieldDefinition.type === 'multi-select') {
      const allowedValues = fieldDefinition.options.map((option) => option.value);
      const baseSchema = z.array(z.enum(allowedValues as [string, ...string[]])).min(1);
      shape[fieldKey] = fieldDefinition.maxSelections ? baseSchema.max(fieldDefinition.maxSelections) : baseSchema;
      return;
    }

    if (fieldDefinition.type === 'number') {
      let schema = z.number();
      if (typeof fieldDefinition.min === 'number') {
        schema = schema.min(fieldDefinition.min);
      }
      if (typeof fieldDefinition.max === 'number') {
        schema = schema.max(fieldDefinition.max);
      }
      shape[fieldKey] = schema;
      return;
    }

    let textSchema = z.string();
    if (typeof fieldDefinition.minLength === 'number') {
      textSchema = textSchema.min(fieldDefinition.minLength);
    }
    if (typeof fieldDefinition.maxLength === 'number') {
      textSchema = textSchema.max(fieldDefinition.maxLength);
    }
    shape[fieldKey] = textSchema;
  });

  return z.object(shape).strict().partial();
}

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

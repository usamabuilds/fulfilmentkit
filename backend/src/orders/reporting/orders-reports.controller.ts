import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { z } from 'zod';
import { OrdersReportsService, type ReportFilterDefinitionMap, type ReportKey } from './orders-reports.service';
import { apiResponse } from '../../common/utils/api-response';
import { toListResponse } from '../../common/utils/list-response';
import { requireWorkspaceId } from '../../common/workspace/workspace.utils';

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
      const enumSchema = z.enum(allowedValues as [string, ...string[]]);
      const arraySchema = z
        .array(z.string().transform((value) => value.toLowerCase()).pipe(enumSchema))
        .min(1);
      shape[fieldKey] = fieldKey === 'platform'
        ? z.union([
          z.string().transform((value) => value.toLowerCase()).pipe(enumSchema),
          arraySchema,
        ]).transform((value) => {
          if (Array.isArray(value)) {
            return value;
          }
          return value;
        })
        : enumSchema;
      return;
    }

    if (fieldDefinition.type === 'multi-select') {
      const allowedValues = fieldDefinition.options.map((option) => option.value);
      const enumSchema = z.enum(allowedValues as [string, ...string[]]);
      const baseSchema = z.array(enumSchema).min(1);
      const multiSchema = fieldDefinition.maxSelections ? baseSchema.max(fieldDefinition.maxSelections) : baseSchema;
      const normalizedArraySchema = fieldDefinition.maxSelections
        ? z
          .array(z.string().transform((value) => value.toLowerCase()).pipe(enumSchema))
          .min(1)
          .max(fieldDefinition.maxSelections)
        : z.array(z.string().transform((value) => value.toLowerCase()).pipe(enumSchema)).min(1);
      shape[fieldKey] = fieldKey === 'platform'
        ? z.union([
          z.string().transform((value) => value.toLowerCase()).pipe(enumSchema),
          normalizedArraySchema,
        ]).transform((value) => {
          if (Array.isArray(value)) {
            return value;
          }
          return value;
        })
        : multiSchema;
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

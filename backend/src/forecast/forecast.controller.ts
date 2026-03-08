import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { ForecastService } from './forecast.service';
import { Roles } from '../common/auth/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { toListResponse } from '../common/utils/list-response';
import { apiResponse } from '../common/utils/api-response';

const ForecastBodySchema = z
  .object({
    from: z.string().min(10),
    to: z.string().min(10),

    horizonDays: z.number().int().min(1).max(365).optional(),

    // SKU-level options (one of these)
    sku: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),

    method: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasSku = !!val.sku && val.sku.trim().length > 0;
    const hasProductId = !!val.productId && val.productId.trim().length > 0;

    if (hasSku && hasProductId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either sku OR productId, not both.',
        path: ['sku'],
      });
    }
  });

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

@Controller('forecast')
export class ForecastController {
  constructor(
    private readonly forecastService: ForecastService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /forecast (ADMIN + OWNER only)
  @Roles('ADMIN', 'OWNER')
  @Post()
  async createForecast(@Req() req: any, @Body() body: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = ForecastBodySchema.parse(body);

    const result = await this.forecastService.createForecast({
      workspaceId,
      from: parsed.from,
      to: parsed.to,
      horizonDays: parsed.horizonDays,
      sku: parsed.sku,
      productId: parsed.productId,
      method: parsed.method,
    });

    if (!result.success) {
      throw new BadRequestException(result.error?.message ?? 'Request failed');
    }

    return apiResponse(result.data);
  }

  // GET /forecast (VIEWER allowed)
  @Roles('VIEWER', 'ADMIN', 'OWNER')
  @Get()
  async listForecasts(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = ListQuerySchema.parse(query);

    const { items, total } = await this.forecastService.listForecasts({
      workspaceId,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });

    return apiResponse(
      toListResponse({
      items: items.map((x) => ({
        ...x,
        createdAt: x.createdAt.toISOString(),
        updatedAt: x.updatedAt.toISOString(),
      })),
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      }),
    );
  }

  // GET /forecast/:id (VIEWER allowed)
  @Roles('VIEWER', 'ADMIN', 'OWNER')
  @Get(':id')
  async getForecast(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.workspaceId as string;

    const forecast = await this.prisma.forecast.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        result: true,
      },
    });

    if (!forecast) {
      throw new NotFoundException('Forecast not found');
    }

    return apiResponse({
        id: forecast.id,
        createdAt: forecast.createdAt.toISOString(),
        updatedAt: forecast.updatedAt.toISOString(),
        ...(forecast.result as any),
      });
  }
}

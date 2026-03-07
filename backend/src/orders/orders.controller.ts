import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { OrdersService } from './orders.service';
import { parsePagination } from '../common/utils/pagination';
import { toListResponse } from '../common/utils/list-response';
import { validateQuery } from '../common/utils/query-validate';
import { parseDateRange } from '../common/utils/date-range';

const ordersListQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().trim().min(1).optional(),
  channel: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const orderIdParamSchema = z.object({
  id: z.string().uuid(),
});

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;

    const q = validateQuery(ordersListQuerySchema, query);
    const { from, to } = parseDateRange(q);

    const { page, pageSize, skip, take } = parsePagination(q, {
      page: 1,
      pageSize: 20,
    });

    const result = await this.ordersService.list({
      workspaceId,
      from,
      to,
      status: q.status,
      channel: q.channel,
      search: q.search,
      skip,
      take,
    });

    return toListResponse({
      items: result.items,
      total: result.total,
      page,
      pageSize,
    });
  }

  @Get(':id')
  async detail(@Req() req: any, @Param() params: any) {
    const workspaceId = req.workspaceId;
    const { id } = validateQuery(orderIdParamSchema, params);

    return this.ordersService.getById({
      workspaceId,
      id,
    });
  }
}

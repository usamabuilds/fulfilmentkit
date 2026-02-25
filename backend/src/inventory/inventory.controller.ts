import { Controller, Get, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { InventoryService } from './inventory.service';
import { parsePagination } from '../common/utils/pagination';
import { toListResponse } from '../common/utils/list-response';
import { validateQuery } from '../common/utils/query-validate';

const inventoryListQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async list(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId;

    const q = validateQuery(inventoryListQuerySchema, query);
    const { page, pageSize, skip, take } = parsePagination(q, {
      page: 1,
      pageSize: 20,
    });

    const result = await this.inventoryService.list({
      workspaceId,
      locationId: q.locationId,
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
}

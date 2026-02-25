import { Controller, Get, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { validateQuery } from '../common/utils/query-validate';
import { parsePagination } from '../common/utils/pagination';
import { toListResponse } from '../common/utils/list-response';
import { requireWorkspaceId } from '../common/workspace/workspace.utils';
import { SkusService } from './skus.service';

const SkusListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

@Controller()
export class SkusController {
  constructor(private readonly skus: SkusService) {}

  @Get('skus')
  async list(@Req() req: any, @Query() query: any) {
    const workspaceId = requireWorkspaceId(req);

    const validated = validateQuery(SkusListQuerySchema, query);
    const { page, pageSize } = parsePagination(validated, { page: 1, pageSize: 25 });

    const result = await this.skus.listSkus({
      workspaceId,
      search: validated.search,
      page,
      pageSize,
    });

    return toListResponse(result);
  }
}

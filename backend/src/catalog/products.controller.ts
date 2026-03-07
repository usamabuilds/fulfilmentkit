import { Controller, Get, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { ProductsService } from './products.service';
import { validateQuery } from '../common/utils/query-validate';
import { parsePagination } from '../common/utils/pagination';
import { toListResponse } from '../common/utils/list-response';
import { requireWorkspaceId } from '../common/workspace/workspace.utils';

const ProductsListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('products')
  async list(@Req() req: any, @Query() query: any) {
    const workspaceId = requireWorkspaceId(req);

    const validated = validateQuery(ProductsListQuerySchema, query);
    const { page, pageSize } = parsePagination(validated, { page: 1, pageSize: 25 });

    const result = await this.products.listProducts({
      workspaceId,
      search: validated.search,
      page,
      pageSize,
    });

    return toListResponse(result);
  }
}

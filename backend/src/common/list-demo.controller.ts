import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { z } from 'zod';
import { parseDateRange } from './utils/date-range';
import { parsePagination } from './utils/pagination';
import { validateQuery } from './utils/query-validate';
import { toListResponse } from './utils/list-response';
import { WorkspaceGuard } from './guards/workspace.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { PrismaService } from './prisma/prisma.service';
import { requireWorkspaceId } from './workspace/workspace.utils';

const ListDemoQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

@UseGuards(WorkspaceGuard, RolesGuard)
@Controller('health')
export class ListDemoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('list-demo')
  listDemo(@Query() query: any) {
    // 1) Validate query keys/types
    const validated = validateQuery(ListDemoQuerySchema, query);

    // 2) Parse pagination
    const { page, pageSize } = parsePagination(validated, { page: 1, pageSize: 25 });

    // 3) Parse date range
    const { from, to } = parseDateRange(validated);

    // 4) Fake list data
    const items = [
      {
        id: 'demo-1',
        note: 'This is a demo list response',
        page,
        pageSize,
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null,
      },
    ];

    return toListResponse({
      items,
      total: 1,
      page,
      pageSize,
    });
  }

  // DB-backed proof endpoint: always scoped by workspaceId
  @Get('locations')
  async listLocations(@Req() req: any) {
    const workspaceId = requireWorkspaceId(req);

    const locations = await this.prisma.location.findMany({
      where: { workspaceId },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        createdAt: true,
      },
    });

    return {
      items: locations,
      total: locations.length,
    };
  }

  @Roles('ADMIN')
  @Get('admin-only')
  adminOnly() {
    return {
      ok: true,
      message: 'ADMIN access granted',
    };
  }
}

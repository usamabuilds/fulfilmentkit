import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { PlanningService } from './planning.service';
import { Roles } from '../common/auth/roles.decorator';

const CreatePlanBodySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  title: z.string().min(1).optional(),
});

@Controller('plans')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  // POST /plans
  // Creates a draft plan and persists resultJson + assumptionsJson
  // ✅ Sensitive: requires ADMIN/OWNER
  @Roles('ADMIN', 'OWNER')
  @Post()
  async createPlan(@Req() req: any, @Body() body: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = CreatePlanBodySchema.parse(body);

    return this.planningService.createPlan({
      workspaceId,
      title: parsed.title,
      range: { from: parsed.from, to: parsed.to },
    });
  }

  // GET /plans?from=&to=&page=&pageSize=
  // Lists plans (workspace-scoped) with optional createdAt date filtering
  // ✅ Not sensitive: VIEWER+ can read (no Roles decorator)
  @Get()
  async listPlans(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;

    const pagination = parsePagination(query, { page: 1, pageSize: 25 });
    const range = parseDateRange(query);

    return this.planningService.listPlans({
      workspaceId,
      createdAtRange: {
        from: range.from,
        to: range.to,
        toIsDateOnly: range.toIsDateOnly,
      },
      pagination,
    });
  }

  // GET /plans/:id
  // Returns plan detail (workspace-scoped)
  // ✅ Not sensitive: VIEWER+ can read (no Roles decorator)
  @Get(':id')
  async getPlanDetail(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.workspaceId as string;

    return this.planningService.getPlanDetail({
      workspaceId,
      planId: id,
    });
  }
}

/* -----------------------------
   Local helpers (self-contained)
------------------------------ */

type PaginationParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

function parsePagination(
  query: any,
  defaults?: { page?: number; pageSize?: number },
): PaginationParams {
  const rawPage = query?.page;
  const rawPageSize = query?.pageSize;

  const pageDefault = defaults?.page ?? 1;
  const pageSizeDefault = defaults?.pageSize ?? 25;

  const page = clampInt(toInt(rawPage, pageDefault), 1, 1_000_000);
  const pageSize = clampInt(toInt(rawPageSize, pageSizeDefault), 1, 200);

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}

function toInt(value: any, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clampInt(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

type DateRangeParsed = {
  from?: Date;
  to?: Date;
  toIsDateOnly?: boolean;
};

function parseDateRange(query: any): DateRangeParsed {
  const rawFrom = query?.from;
  const rawTo = query?.to;

  const from = parseDate(rawFrom);
  const to = parseDate(rawTo);

  const toIsDateOnly =
    typeof rawTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTo.trim());

  if (from && to && from.getTime() > to.getTime()) {
    return { from: to, to: from, toIsDateOnly };
  }

  return { from, to, toIsDateOnly };
}

function parseDate(value: any): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const s = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? undefined : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

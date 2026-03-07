import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiToolsetService } from '../ai/ai-toolset.service';

type DateRange = { from: string; to: string };

type PaginationParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toolset: AiToolsetService,
  ) {}

  async createPlan(args: {
    workspaceId: string;
    range: DateRange;
    title?: string;
  }) {
    // Reuse our planning-grade output generator (internal only, no external web data)
    const planningOutput = await this.toolset.getPlanningOutput({
      workspaceId: args.workspaceId,
      range: { from: args.range.from, to: args.range.to },
    });

    // toolset.getPlanningOutput currently returns:
    // { tool, workspaceId, range, ok, data }
    // We store data (structured blocks) in resultJson
    const resultJson = (planningOutput as any)?.data ?? planningOutput;

    const assumptionsJson =
      (resultJson && (resultJson as any).assumptions) || {
        note: 'No assumptions present in planning output.',
      };

    const created = await this.prisma.plan.create({
      data: {
        workspaceId: args.workspaceId,
        status: 'draft',
        title: args.title ?? null,
        resultJson,
        assumptionsJson,
      },
    });

    return {
      success: true,
      data: {
        id: created.id,
        workspaceId: created.workspaceId,
        status: created.status,
        title: created.title,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        result: created.resultJson,
        assumptions: created.assumptionsJson,
      },
    };
  }

  async listPlans(args: {
    workspaceId: string;
    createdAtRange?: { from?: Date; to?: Date; toIsDateOnly?: boolean };
    pagination: PaginationParams;
  }) {
    const where: any = {
      workspaceId: args.workspaceId,
    };

    const from = args.createdAtRange?.from;
    const to = args.createdAtRange?.to;

    // IMPORTANT: filters are by Plan.createdAt (as per your rule)
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = from;
      }

      if (to) {
        // If the caller passed YYYY-MM-DD, parseDateRange makes it midnight UTC.
        // Treat it as inclusive end-of-day by using < (to + 1 day).
        if (args.createdAtRange?.toIsDateOnly) {
          const toExclusive = new Date(to.getTime());
          toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
          where.createdAt.lt = toExclusive;
        } else {
          // If user provided a datetime, treat it as inclusive
          where.createdAt.lte = to;
        }
      }
    }

    const [total, rows] = await Promise.all([
      this.prisma.plan.count({ where }),
      this.prisma.plan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: args.pagination.skip,
        take: args.pagination.take,
        select: {
          id: true,
          workspaceId: true,
          status: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          resultJson: true,
          assumptionsJson: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        items: rows.map((p) => ({
          id: p.id,
          workspaceId: p.workspaceId,
          status: p.status,
          title: p.title,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          result: p.resultJson,
          assumptions: p.assumptionsJson,
        })),
        total,
        page: args.pagination.page,
        pageSize: args.pagination.pageSize,
      },
    };
  }

  // GET /plans/:id
  // Workspace scoped
  async getPlanDetail(args: { workspaceId: string; planId: string }) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: args.planId,
        workspaceId: args.workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        status: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        resultJson: true,
        assumptionsJson: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      success: true,
      data: {
        id: plan.id,
        workspaceId: plan.workspaceId,
        status: plan.status,
        title: plan.title,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        result: plan.resultJson,
        assumptions: plan.assumptionsJson,
      },
    };
  }
}

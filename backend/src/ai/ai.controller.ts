import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import { AiService } from './ai.service';
import { AiToolsetService } from './ai-toolset.service';
import { apiResponse } from '../common/utils/api-response';

const AddMessagesSchema = z.object({
  userMessage: z.string().min(1),
  assistantMessage: z.string().min(1),
  metadata: z.any().optional(),
});

const LogToolCallSchema = z.object({
  provider: z.string().min(1),
  toolName: z.string().min(1),
  arguments: z.any(),
  result: z.any().optional(),
});

const KpiSummaryQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
});

const KpiDeltasQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  compareFrom: z.string().min(10),
  compareTo: z.string().min(10),
});

const TrendsQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  keys: z.string().optional(),
});

const BreakdownQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  by: z.enum(['sku', 'channel', 'platform', 'location']),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
});

// Query-level schema (what you accept in URL)
const TopMoversQuerySchema = z
  .object({
    from: z.string().min(10),
    to: z.string().min(10),

    metric: z.enum(['unitsSold', 'revenue', 'refunds', 'fees', 'margin']),
    direction: z.enum(['up', 'down']),

    limit: z
      .string()
      .optional()
      .transform((v) => {
        if (!v) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      }),

    // optional (validated as a pair)
    compareFrom: z.string().min(10).optional(),
    compareTo: z.string().min(10).optional(),
  })
  .superRefine((val, ctx) => {
    const hasCompareFrom = !!val.compareFrom;
    const hasCompareTo = !!val.compareTo;
    if (hasCompareFrom !== hasCompareTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'compareFrom and compareTo must be provided together.',
        path: ['compareFrom'],
      });
    }
  });

const OrderIssuesQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
});

// -------------------------
// Risk tool query schemas
// -------------------------

const StockoutRiskQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  horizonDays: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
});

const LowStockRiskQuerySchema = z.object({
  threshold: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
});

const SpikeRiskQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  compareFrom: z.string().min(10),
  compareTo: z.string().min(10),
});

const MarginLeakageQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  compareFrom: z.string().min(10).optional(),
  compareTo: z.string().min(10).optional(),
});

const OpsRiskQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
});

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly toolset: AiToolsetService,
  ) {}

  // ✅ Create conversation
  @Post('conversations')
  async createConversation(@Req() req: any) {
    const workspaceId = req.workspaceId as string;
    return this.aiService.createConversation(workspaceId);
  }

  // ✅ List conversations
  @Get('conversations')
  async listConversations(@Req() req: any) {
    const workspaceId = req.workspaceId as string;
    const result = await this.aiService.listConversations(workspaceId);
    return apiResponse(result);
  }

  // ✅ Get messages of a conversation
  @Get('conversations/:id')
  async getConversationMessages(
    @Req() req: any,
    @Param('id') conversationId: string,
  ) {
    const workspaceId = req.workspaceId as string;
    const result = await this.aiService.getConversationMessages(workspaceId, conversationId);

    if (!result.success) {
      throw new NotFoundException(result.error?.message ?? 'Conversation not found');
    }

    return apiResponse(result.data);
  }

  // ✅ Store user message + assistant message
  @Post('conversations/:id/messages')
  async addMessages(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body() body: any,
  ) {
    const workspaceId = req.workspaceId as string;
    const parsed = AddMessagesSchema.parse(body);
    const result = await this.aiService.addMessages(workspaceId, conversationId, parsed);

    if (!result.success) {
      throw new NotFoundException(result.error?.message ?? 'Conversation not found');
    }

    return apiResponse(result.data);
  }

  // ✅ Log tool call
  @Post('messages/:messageId/tool-calls')
  async logToolCall(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body() body: any,
  ) {
    const workspaceId = req.workspaceId as string;
    const parsed = LogToolCallSchema.parse(body);

    const result = await this.aiService.logToolCall(workspaceId, {
      messageId,
      ...parsed,
    });

    if (!result.success) {
      throw new NotFoundException(result.error?.message ?? 'Message not found');
    }

    return apiResponse(result.data);
  }

  // -------------------------
  // KPI tools (V1)
  // -------------------------

  @Get('tools/kpi-summary')
  async toolGetKpiSummary(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = KpiSummaryQuerySchema.parse(query);

    const result = await this.toolset.getKpiSummary({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
    });

    return apiResponse(result);
  }

  @Get('tools/kpi-deltas')
  async toolGetKpiDeltas(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = KpiDeltasQuerySchema.parse(query);

    const result = await this.toolset.getKpiDeltas({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      compareTo: { from: parsed.compareFrom, to: parsed.compareTo },
    });

    return apiResponse(result);
  }

  @Get('tools/trends')
  async toolGetTrends(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = TrendsQuerySchema.parse(query);

    const keys =
      parsed.keys && parsed.keys.trim().length > 0
        ? parsed.keys
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;

    const result = await this.toolset.getTrends({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      metricKeys: keys,
    });

    return apiResponse(result);
  }

  @Get('tools/breakdown')
  async toolGetBreakdown(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = BreakdownQuerySchema.parse(query);

    const result = await this.toolset.getBreakdown({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      by: parsed.by,
      limit: parsed.limit,
    });

    return apiResponse(result);
  }

  // ✅ UPDATED: pass optional compare range through (so service can compute delta/deltaPct)
  @Get('tools/top-movers')
  async toolGetTopMovers(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = TopMoversQuerySchema.parse(query);

    const metricMap: Record<
      z.infer<typeof TopMoversQuerySchema>['metric'],
      'unitsSold' | 'revenue' | 'refunds' | 'fees' | 'margin'
    > = {
      unitsSold: 'unitsSold',
      revenue: 'revenue',
      refunds: 'refunds',
      fees: 'fees',
      margin: 'margin',
    };

    const result = await this.toolset.getTopMovers({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      compareTo:
        parsed.compareFrom && parsed.compareTo
          ? { from: parsed.compareFrom, to: parsed.compareTo }
          : undefined,
      metric: metricMap[parsed.metric],
      direction: parsed.direction,
      limit: parsed.limit,
    });

    return apiResponse(result);
  }

  @Get('tools/order-issues')
  async toolGetOrderIssues(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = OrderIssuesQuerySchema.parse(query);

    const result = await this.toolset.getOrderIssues({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      limit: parsed.limit,
    });

    return apiResponse(result);
  }

  // -------------------------
  // Risk tools (V1)
  // -------------------------

  // GET /ai/tools/stockout-risk?from=YYYY-MM-DD&to=YYYY-MM-DD&horizonDays=14&limit=50
  @Get('tools/stockout-risk')
  async toolGetStockoutRisk(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = StockoutRiskQuerySchema.parse(query);

    const result = await this.toolset.getStockoutRisk({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      horizonDays: parsed.horizonDays,
      limit: parsed.limit,
    });

    return apiResponse(result);
  }

  // GET /ai/tools/low-stock-risk?threshold=10&limit=50
  @Get('tools/low-stock-risk')
  async toolGetLowStockRisk(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = LowStockRiskQuerySchema.parse(query);

    const result = await this.toolset.getLowStockRisk({
      workspaceId,
      threshold: parsed.threshold,
      limit: parsed.limit,
    });

    return apiResponse(result);
  }

  // GET /ai/tools/refund-spike-risk?from=YYYY-MM-DD&to=YYYY-MM-DD&compareFrom=YYYY-MM-DD&compareTo=YYYY-MM-DD
  @Get('tools/refund-spike-risk')
  async toolGetRefundSpikeRisk(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = SpikeRiskQuerySchema.parse(query);

    const result = await this.toolset.getRefundSpikeRisk({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      compareTo: { from: parsed.compareFrom, to: parsed.compareTo },
    });

    return apiResponse(result);
  }

  // GET /ai/tools/fee-spike-risk?from=YYYY-MM-DD&to=YYYY-MM-DD&compareFrom=YYYY-MM-DD&compareTo=YYYY-MM-DD
  @Get('tools/fee-spike-risk')
  async toolGetFeeSpikeRisk(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = SpikeRiskQuerySchema.parse(query);

    const result = await this.toolset.getFeeSpikeRisk({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      compareTo: { from: parsed.compareFrom, to: parsed.compareTo },
    });

    return apiResponse(result);
  }

  // GET /ai/tools/margin-leakage?from=YYYY-MM-DD&to=YYYY-MM-DD&compareFrom=...&compareTo=...
  @Get('tools/margin-leakage')
  async toolGetMarginLeakage(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = MarginLeakageQuerySchema.parse(query);

    const result = await this.toolset.getMarginLeakageRisk({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
      compareTo:
        parsed.compareFrom && parsed.compareTo
          ? { from: parsed.compareFrom, to: parsed.compareTo }
          : undefined,
    });

    return apiResponse(result);
  }

  // GET /ai/tools/ops-risk?from=YYYY-MM-DD&to=YYYY-MM-DD
  @Get('tools/ops-risk')
  async toolGetOpsRisk(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = OpsRiskQuerySchema.parse(query);

    const result = await this.toolset.getOpsRisk({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
    });

    return apiResponse(result);
  }

  // -------------------------
  // Planning-grade AI output (V1)
  // Always structured blocks:
  // statusBullets, topRisks, opportunities, next7DaysPlan, assumptions
  // No external web data
  // Assumptions include date range + data scope
  // -------------------------
  @Get('plan')
  async getPlanningOutput(@Req() req: any, @Query() query: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = KpiSummaryQuerySchema.parse(query);

    const result = await this.toolset.getPlanningOutput({
      workspaceId,
      range: { from: parsed.from, to: parsed.to },
    });

    return apiResponse(result);
  }
}

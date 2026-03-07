import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type AddMessagesArgs = {
  userMessage: string;
  assistantMessage: string;
  metadata?: any;
};

type LogToolCallArgs = {
  messageId: string; // usually the assistant message id
  provider: string; // e.g. "openai"
  toolName: string; // e.g. "web.search" or "calculator"
  arguments: any; // JSON
  result?: any; // JSON (optional)
};

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Create conversation
  async createConversation(workspaceId: string) {
    const convo = await this.prisma.aiConversation.create({
      data: {
        workspaceId,
        title: 'New conversation',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        id: convo.id,
        title: convo.title,
        createdAt: convo.createdAt.toISOString(),
      },
    };
  }

  // ✅ List conversations
  async listConversations(workspaceId: string) {
    const conversations = await this.prisma.aiConversation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        items: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.createdAt.toISOString(),
        })),
      },
    };
  }

  // ✅ Get messages of a conversation
  async getConversationMessages(workspaceId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            toolCalls: true,
          },
        },
      },
    });

    if (!conversation) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        },
      };
    }

    return {
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata,
          createdAt: m.createdAt.toISOString(),
          toolCalls: m.toolCalls,
        })),
      },
    };
  }

  // ✅ Store user message + assistant message
  async addMessages(
    workspaceId: string,
    conversationId: string,
    args: AddMessagesArgs,
  ) {
    const { userMessage, assistantMessage, metadata } = args;

    // ensure conversation exists + workspace scoped
    const convo = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, workspaceId },
      select: { id: true },
    });

    if (!convo) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        },
      };
    }

    // create both messages in one transaction
    const [userMsg, assistantMsg] = await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: {
          workspaceId,
          conversationId,
          role: 'user',
          content: userMessage,
          metadata: metadata ?? null,
        },
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      this.prisma.aiMessage.create({
        data: {
          workspaceId,
          conversationId,
          role: 'assistant',
          content: assistantMessage,
          metadata: metadata ?? null,
        },
        select: { id: true, role: true, content: true, createdAt: true },
      }),
    ]);

    return {
      success: true,
      data: {
        conversationId,
        created: [
          { ...userMsg, createdAt: userMsg.createdAt.toISOString() },
          { ...assistantMsg, createdAt: assistantMsg.createdAt.toISOString() },
        ],
      },
    };
  }

  // ✅ Log tool call (AiToolCall) with params/result JSON
  async logToolCall(workspaceId: string, args: LogToolCallArgs) {
    const { messageId, provider, toolName, arguments: toolArgs, result } = args;

    // Ensure message exists + workspace scoped
    const msg = await this.prisma.aiMessage.findFirst({
      where: { id: messageId, workspaceId },
      select: { id: true },
    });

    if (!msg) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Message not found for this workspace',
        },
      };
    }

    const tc = await this.prisma.aiToolCall.create({
      data: {
        messageId,
        provider,
        toolName,
        arguments: toolArgs ?? {},
        result: result ?? null,
      },
      select: {
        id: true,
        messageId: true,
        provider: true,
        toolName: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        id: tc.id,
        messageId: tc.messageId,
        provider: tc.provider,
        toolName: tc.toolName,
        createdAt: tc.createdAt.toISOString(),
      },
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '../generated/prisma';
import { toListResponse } from '../common/utils/list-response';

type AddUserMessageArgs = {
  content: string;
  metadata?: unknown;
};

type LogToolCallArgs = {
  messageId: string; // usually the assistant message id
  provider: string; // e.g. "openai"
  toolName: string; // e.g. "web.search" or "calculator"
  arguments: unknown; // JSON
  result?: unknown; // JSON (optional)
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

    return toListResponse({
      items: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
      })),
      total: conversations.length,
      page: 1,
      pageSize: conversations.length,
    });
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
      throw new NotFoundException('Conversation not found');
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

  // ✅ Store user message, then append assistant reply
  async addUserMessage(
    workspaceId: string,
    conversationId: string,
    args: AddUserMessageArgs,
  ) {
    const { content, metadata } = args;
    const metadataValue =
      metadata == null ? Prisma.DbNull : (metadata as Prisma.InputJsonValue);

    // ensure conversation exists + workspace scoped
    const convo = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, workspaceId },
      select: { id: true },
    });

    if (!convo) {
      throw new NotFoundException('Conversation not found');
    }

    const userMsg = await this.prisma.aiMessage.create({
      data: {
        workspaceId,
        conversationId,
        role: 'user',
        content,
        metadata: metadataValue,
      },
      select: { id: true, role: true, content: true, metadata: true, createdAt: true },
    });

    const assistantReply = this.generateAssistantReply(content);

    await this.prisma.aiMessage.create({
      data: {
        workspaceId,
        conversationId,
        role: 'assistant',
        content: assistantReply,
      },
    });

    return {
      success: true,
      data: {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        metadata: userMsg.metadata,
        createdAt: userMsg.createdAt.toISOString(),
      },
    };
  }

  private generateAssistantReply(userContent: string): string {
    return `Thanks for your message: "${userContent}". I am preparing a fuller response.`;
  }

  // ✅ Log tool call (AiToolCall) with params/result JSON
  async logToolCall(workspaceId: string, args: LogToolCallArgs) {
    const { messageId, provider, toolName, arguments: toolArgs, result } = args;
    const resultValue =
      result == null ? Prisma.DbNull : (result as Prisma.InputJsonValue);

    // Ensure message exists + workspace scoped
    const msg = await this.prisma.aiMessage.findFirst({
      where: { id: messageId, workspaceId },
      select: { id: true },
    });

    if (!msg) {
      throw new NotFoundException('Message not found for this workspace');
    }

    const tc = await this.prisma.aiToolCall.create({
      data: {
        messageId,
        provider,
        toolName,
        arguments: toolArgs ?? {},
        result: resultValue,
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

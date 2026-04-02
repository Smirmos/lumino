import { Injectable, Inject, Logger } from '@nestjs/common';
import { Db } from '../db';
import { conversations, messages, monthlyUsageRollup } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

interface RecordUsageInput {
  clientId: string;
  inputTokens: number;
  outputTokens: number;
  channel: 'instagram' | 'whatsapp';
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(@Inject('DB') private readonly db: Db) {}

  async upsertConversation(clientId: string, channel: string, customerIdentifier: string): Promise<void> {
    try {
      // Find existing active conversation
      const existing = await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
            eq(conversations.status, 'active'),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing conversation
        await this.db
          .update(conversations)
          .set({
            lastMessageAt: sql`now()`,
            messageCount: sql`${conversations.messageCount} + 1`,
          })
          .where(eq(conversations.id, existing[0].id));
      } else {
        // Create new conversation
        await this.db.insert(conversations).values({
          clientId,
          channel,
          customerIdentifier,
          messageCount: 1,
        });
      }
    } catch (err: any) {
      this.logger.error('Failed to upsert conversation', err.message);
    }
  }

  async getConversationStatus(
    clientId: string,
    channel: string,
    customerIdentifier: string,
  ): Promise<string | null> {
    try {
      const rows = await this.db
        .select({ status: conversations.status })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
            eq(conversations.status, 'escalated'),
          ),
        )
        .limit(1);
      return rows.length > 0 ? rows[0].status : null;
    } catch (err: any) {
      this.logger.error('Failed to get conversation status', err.message);
      return null;
    }
  }

  async persistMessage(
    clientId: string,
    channel: string,
    customerIdentifier: string,
    role: string,
    content: string,
    inputTokens?: number,
    outputTokens?: number,
  ): Promise<void> {
    try {
      // Find conversation ID first
      const convRows = await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
          ),
        )
        .limit(1);

      if (convRows.length > 0) {
        await this.db.insert(messages).values({
          conversationId: convRows[0].id,
          role,
          content,
          inputTokens: inputTokens ?? null,
          outputTokens: outputTokens ?? null,
        });
      }
    } catch (err: any) {
      this.logger.error('Failed to persist message', err.message);
    }
  }

  async markEscalated(clientId: string, channel: string, customerIdentifier: string): Promise<void> {
    try {
      await this.db
        .update(conversations)
        .set({ status: 'escalated', escalatedAt: sql`now()` })
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
          ),
        );
    } catch (err: any) {
      this.logger.error('Failed to mark escalated', err.message);
    }
  }

  async markMessageAsEscalationTrigger(
    clientId: string,
    channel: string,
    customerIdentifier: string,
  ): Promise<void> {
    try {
      const convRows = await this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.channel, channel),
            eq(conversations.customerIdentifier, customerIdentifier),
          ),
        )
        .limit(1);

      if (convRows.length === 0) return;

      const msgRows = await this.db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, convRows[0].id),
            eq(messages.role, 'user'),
          ),
        )
        .orderBy(sql`${messages.createdAt} DESC`)
        .limit(1);

      if (msgRows.length > 0) {
        await this.db
          .update(messages)
          .set({ isEscalationTrigger: true })
          .where(eq(messages.id, msgRows[0].id));
      }
    } catch (err: any) {
      this.logger.error('Failed to mark escalation trigger', err.message);
    }
  }

  async record(input: RecordUsageInput): Promise<void> {
    try {
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Find existing rollup row
      const existing = await this.db
        .select({ id: monthlyUsageRollup.id })
        .from(monthlyUsageRollup)
        .where(
          and(
            eq(monthlyUsageRollup.clientId, input.clientId),
            eq(monthlyUsageRollup.month, month),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const channelIncrement = input.channel === 'instagram'
          ? { channelInstagram: sql`${monthlyUsageRollup.channelInstagram} + 1` }
          : { channelWhatsapp: sql`${monthlyUsageRollup.channelWhatsapp} + 1` };

        await this.db
          .update(monthlyUsageRollup)
          .set({
            totalMessages: sql`${monthlyUsageRollup.totalMessages} + 1`,
            totalInputTokens: sql`${monthlyUsageRollup.totalInputTokens} + ${input.inputTokens}`,
            totalOutputTokens: sql`${monthlyUsageRollup.totalOutputTokens} + ${input.outputTokens}`,
            ...channelIncrement,
          })
          .where(eq(monthlyUsageRollup.id, existing[0].id));
      } else {
        await this.db.insert(monthlyUsageRollup).values({
          clientId: input.clientId,
          month,
          totalMessages: 1,
          totalInputTokens: input.inputTokens,
          totalOutputTokens: input.outputTokens,
          channelInstagram: input.channel === 'instagram' ? 1 : 0,
          channelWhatsapp: input.channel === 'whatsapp' ? 1 : 0,
        });
      }
    } catch (err: any) {
      this.logger.error('Failed to record usage', err.message);
    }
  }
}

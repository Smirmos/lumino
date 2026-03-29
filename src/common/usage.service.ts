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
      await this.db
        .insert(conversations)
        .values({
          clientId,
          channel,
          customerIdentifier,
          messageCount: 1,
        })
        .onConflictDoUpdate({
          target: [conversations.clientId, conversations.channel, conversations.customerIdentifier],
          set: {
            lastMessageAt: sql`now()`,
            messageCount: sql`${conversations.messageCount} + 1`,
          },
        });
    } catch (err: any) {
      this.logger.error('Failed to upsert conversation', err.message);
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

  async record(input: RecordUsageInput): Promise<void> {
    try {
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const channelField = input.channel === 'instagram' ? 'channelInstagram' : 'channelWhatsapp';

      await this.db
        .insert(monthlyUsageRollup)
        .values({
          clientId: input.clientId,
          month,
          totalMessages: 1,
          totalInputTokens: input.inputTokens,
          totalOutputTokens: input.outputTokens,
          [channelField]: 1,
        })
        .onConflictDoUpdate({
          target: [monthlyUsageRollup.clientId, monthlyUsageRollup.month],
          set: {
            totalMessages: sql`${monthlyUsageRollup.totalMessages} + 1`,
            totalInputTokens: sql`${monthlyUsageRollup.totalInputTokens} + ${input.inputTokens}`,
            totalOutputTokens: sql`${monthlyUsageRollup.totalOutputTokens} + ${input.outputTokens}`,
            [channelField]: sql`${monthlyUsageRollup[channelField]} + 1`,
          },
        });
    } catch (err: any) {
      this.logger.error('Failed to record usage', err.message);
    }
  }
}

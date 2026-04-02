import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';
import { eq, and, lt, isNull, sql } from 'drizzle-orm';
import { Db } from '../db';
import { conversations, messages, conversationSummaries, clientConfigs } from '../db/schema';

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);
  private readonly anthropic: Anthropic;

  constructor(
    @Inject('DB') private readonly db: Db,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    this.anthropic = new Anthropic();
  }

  /**
   * Runs every 5 minutes. Finds conversations inactive for 2+ hours
   * that haven't been summarized yet, and generates summaries.
   */
  @Cron('0 */5 * * * *')
  async summarizeInactiveConversations(): Promise<void> {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // Find active conversations inactive for 2+ hours, not yet summarized
      // Only for clients with pro or pro_plus plans
      const inactive = await this.db
        .select({
          id: conversations.id,
          clientId: conversations.clientId,
          channel: conversations.channel,
          customerIdentifier: conversations.customerIdentifier,
          startedAt: conversations.startedAt,
          lastMessageAt: conversations.lastMessageAt,
          messageCount: conversations.messageCount,
          status: conversations.status,
        })
        .from(conversations)
        .innerJoin(clientConfigs, eq(conversations.clientId, clientConfigs.id))
        .where(and(
          lt(conversations.lastMessageAt, twoHoursAgo),
          sql`${conversations.id} NOT IN (SELECT conversation_id FROM conversation_summaries)`,
          sql`${clientConfigs.subscriptionPlan} IN ('pro', 'pro_plus')`,
        ))
        .limit(10); // Process 10 at a time

      if (inactive.length === 0) return;

      this.logger.log(`Found ${inactive.length} conversations to summarize`);

      for (const conv of inactive) {
        try {
          await this.summarizeConversation(conv);
        } catch (err) {
          this.logger.error(`Failed to summarize conversation ${conv.id}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.logger.error(`Summarization cron failed: ${(err as Error).message}`);
    }
  }

  private async summarizeConversation(conv: {
    id: string;
    clientId: string;
    channel: string;
    customerIdentifier: string;
    startedAt: Date | null;
    lastMessageAt: Date | null;
    messageCount: number | null;
    status: string | null;
  }): Promise<void> {
    // Get all messages for this conversation
    const msgs = await this.db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(messages.createdAt);

    if (msgs.length === 0) return;

    // Format conversation for Claude
    const transcript = msgs.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Summarize this customer service conversation in 3 lines max.
Format as JSON:
{
  "summary": "string - what the customer wanted",
  "botResolved": true/false,
  "needsFollowUp": true/false,
  "customerSentiment": "positive" | "neutral" | "negative",
  "topicTags": ["1-3 topic labels"]
}
Return ONLY valid JSON, no markdown, no explanation.

Conversation:
${transcript}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: {
      summary: string;
      botResolved: boolean;
      needsFollowUp: boolean;
      customerSentiment: string;
      topicTags: string[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      this.logger.warn(`Failed to parse summary JSON for ${conv.id}: ${text}`);
      parsed = {
        summary: text.slice(0, 200),
        botResolved: false,
        needsFollowUp: true,
        customerSentiment: 'neutral',
        topicTags: [],
      };
    }

    // Store summary
    await this.db.insert(conversationSummaries).values({
      conversationId: conv.id,
      clientId: conv.clientId,
      channel: conv.channel,
      customerIdentifier: conv.customerIdentifier,
      startedAt: conv.startedAt,
      endedAt: conv.lastMessageAt,
      messageCount: conv.messageCount,
      summary: parsed.summary,
      botResolved: parsed.botResolved,
      needsFollowUp: parsed.needsFollowUp,
      customerSentiment: parsed.customerSentiment,
      topicTags: parsed.topicTags,
      status: parsed.needsFollowUp ? 'needs_follow_up' : 'resolved',
    });

    // Clean up Redis context for this conversation (find the key pattern)
    const redisPattern = `conv:${conv.channel}:*:${conv.clientId}`;
    const keys = await this.redis.keys(redisPattern);
    for (const key of keys) {
      // Only delete if the key content matches this customer
      if (key.includes(conv.customerIdentifier)) {
        await this.redis.del(key);
      }
    }

    this.logger.log(`Summarized conversation ${conv.id}: ${parsed.summary.slice(0, 50)}...`);
  }
}

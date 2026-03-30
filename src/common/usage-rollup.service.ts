import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { Db } from '../db';

@Injectable()
export class UsageRollupService {
  private readonly logger = new Logger(UsageRollupService.name);

  constructor(@Inject('DB') private db: Db) {}

  @Cron('0 2 * * *')
  async rollupYesterday(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await this.rollupForDate(yesterday);
  }

  async rollupForDate(date: Date): Promise<void> {
    const dateStr = date.toISOString().slice(0, 10);
    const monthStr = dateStr.slice(0, 7);

    this.logger.log({ event: 'usage_rollup_start', date: dateStr });

    try {
      await this.db.execute(sql`
        INSERT INTO monthly_usage_rollup
          (id, client_id, month, total_conversations, total_messages,
           total_escalations, total_input_tokens, total_output_tokens,
           channel_instagram, channel_whatsapp)
        SELECT
          gen_random_uuid(),
          c.client_id,
          ${monthStr},
          COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.started_at) = ${dateStr}::date),
          COUNT(m.id) FILTER (WHERE DATE(m.created_at) = ${dateStr}::date AND m.role = 'user'),
          COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.escalated_at) = ${dateStr}::date),
          COALESCE(SUM(m.input_tokens) FILTER (WHERE DATE(m.created_at) = ${dateStr}::date), 0),
          COALESCE(SUM(m.output_tokens) FILTER (WHERE DATE(m.created_at) = ${dateStr}::date), 0),
          COUNT(DISTINCT c.id) FILTER (WHERE c.channel = 'instagram' AND DATE(c.started_at) = ${dateStr}::date),
          COUNT(DISTINCT c.id) FILTER (WHERE c.channel = 'whatsapp' AND DATE(c.started_at) = ${dateStr}::date)
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE DATE(c.started_at) = ${dateStr}::date
           OR DATE(m.created_at) = ${dateStr}::date
        GROUP BY c.client_id
        HAVING COUNT(DISTINCT c.id) > 0
      `);

      this.logger.log({ event: 'usage_rollup_complete', date: dateStr });
    } catch (err: any) {
      this.logger.error({ event: 'usage_rollup_failed', date: dateStr, error: err.message });
    }
  }
}

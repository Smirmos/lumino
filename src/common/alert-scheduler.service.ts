import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { Db } from '../db';
import { AlertService } from './alert.service';

@Injectable()
export class AlertSchedulerService {
  private readonly logger = new Logger(AlertSchedulerService.name);

  constructor(
    @Inject('DB') private db: Db,
    private alertService: AlertService,
    private configService: ConfigService,
  ) {}

  @Cron('*/5 * * * *')
  async checkThresholds(): Promise<void> {
    this.logger.log({ event: 'threshold_check_start' });
    await Promise.allSettled([
      this.checkClaudeErrorRate(),
      this.checkClientMessageCaps(),
      this.checkMonthlyTokenBudgets(),
    ]);
    this.logger.log({ event: 'threshold_check_complete' });
  }

  private async checkClaudeErrorRate(): Promise<void> {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = await this.db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE role = 'assistant') as total,
          COUNT(*) FILTER (WHERE role = 'assistant' AND output_tokens = 0) as fallback_count
        FROM messages
        WHERE created_at > ${fiveMinAgo}
      `);

      const total = Number(result.rows[0]?.total ?? 0);
      const fallback = Number(result.rows[0]?.fallback_count ?? 0);

      if (total < 10) return; // not enough data

      const errorRate = fallback / total;
      if (errorRate > 0.05) {
        await this.alertService.sendAlert({
          severity: 'P1',
          title: 'Claude API error rate high',
          metric: 'claude_error_rate_5min',
          currentValue: `${(errorRate * 100).toFixed(1)}%`,
          threshold: '5%',
          environment: this.configService.get('NODE_ENV') ?? 'production',
        });
      }
    } catch (err: any) {
      this.logger.error({ event: 'threshold_check_failed', check: 'claude_error_rate', error: err.message });
    }
  }

  private async checkClientMessageCaps(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = await this.db.execute(sql`
        SELECT c.client_id, COUNT(*) as msg_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.created_at > ${oneHourAgo} AND m.role = 'user'
        GROUP BY c.client_id
        HAVING COUNT(*) > 500
      `);

      for (const row of result.rows) {
        await this.alertService.sendAlert({
          severity: 'P2',
          title: 'Client exceeding hourly message cap',
          metric: 'client_messages_per_hour',
          clientId: row.client_id as string,
          currentValue: Number(row.msg_count),
          threshold: 500,
          environment: this.configService.get('NODE_ENV') ?? 'production',
        });
      }
    } catch (err: any) {
      this.logger.error({ event: 'threshold_check_failed', check: 'client_message_caps', error: err.message });
    }
  }

  private async checkMonthlyTokenBudgets(): Promise<void> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const result = await this.db.execute(sql`
        SELECT
          r.client_id,
          r.total_input_tokens + r.total_output_tokens as total_tokens
        FROM monthly_usage_rollup r
        WHERE r.month = ${currentMonth}
        AND (r.total_input_tokens + r.total_output_tokens) > 800000
      `);

      for (const row of result.rows) {
        await this.alertService.sendAlert({
          severity: 'P3',
          title: 'Client approaching monthly token budget',
          metric: 'monthly_tokens_used',
          clientId: row.client_id as string,
          currentValue: Number(row.total_tokens),
          threshold: '800,000 (80% of default budget)',
          environment: this.configService.get('NODE_ENV') ?? 'production',
        });
      }
    } catch (err: any) {
      this.logger.error({ event: 'threshold_check_failed', check: 'monthly_token_budgets', error: err.message });
    }
  }
}

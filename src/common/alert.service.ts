import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type AlertSeverity = 'P1' | 'P2' | 'P3';

export interface AlertPayload {
  severity: AlertSeverity;
  title: string;
  metric: string;
  clientId?: string;
  currentValue: number | string;
  threshold: number | string;
  environment: string;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly slackWebhookUrl: string;
  private readonly environment: string;

  constructor(private configService: ConfigService) {
    this.slackWebhookUrl = this.configService.get('SLACK_WEBHOOK_URL') ?? '';
    this.environment = this.configService.get('NODE_ENV') ?? 'development';
  }

  async sendAlert(payload: AlertPayload): Promise<void> {
    if (!this.slackWebhookUrl) {
      this.logger.warn({ event: 'alert_skipped', reason: 'SLACK_WEBHOOK_URL not set', ...payload });
      return;
    }

    const emoji: Record<AlertSeverity, string> = { P1: '\u{1F534}', P2: '\u{1F7E1}', P3: '\u{1F535}' };
    const message = {
      text: `${emoji[payload.severity]} *${payload.severity} Alert — ${payload.title}*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `${emoji[payload.severity]} *${payload.severity} — ${payload.title}*\n` +
              `*Metric:* ${payload.metric}\n` +
              `*Value:* ${payload.currentValue} (threshold: ${payload.threshold})\n` +
              (payload.clientId ? `*Client:* ${payload.clientId}\n` : '') +
              `*Environment:* ${payload.environment}\n` +
              `*Time:* ${new Date().toISOString()}`,
          },
        },
      ],
    };

    try {
      await axios.post(this.slackWebhookUrl, message, { timeout: 5000 });
      this.logger.log({ event: 'alert_sent', severity: payload.severity, title: payload.title });
    } catch (err: any) {
      // Alert sending must never throw — log and continue
      this.logger.error({ event: 'alert_send_failed', error: err.message });
    }
  }

  async alertInfraFailure(service: 'database' | 'redis', error: string): Promise<void> {
    await this.sendAlert({
      severity: 'P1',
      title: `${service} connection failure`,
      metric: `${service}_health_check`,
      currentValue: 'FAILED',
      threshold: 'OK',
      environment: this.environment,
    });
  }
}

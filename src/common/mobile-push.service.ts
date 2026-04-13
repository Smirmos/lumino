import { Injectable, Inject, Logger } from '@nestjs/common';
import { Db } from '../db';
import { mobilePushTokens } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'default' | 'high';
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends Expo push notifications to all registered mobile devices for a
 * client. Failures (e.g. revoked tokens) are pruned from the database
 * automatically so we don't keep retrying dead tokens.
 */
@Injectable()
export class MobilePushService {
  private readonly logger = new Logger(MobilePushService.name);

  constructor(@Inject('DB') private readonly db: Db) {}

  /**
   * Pushes a notification to every registered device for the client.
   * Fire-and-forget — failures are logged but never thrown.
   */
  async sendToClient(
    clientId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const rows = await this.db
        .select({ id: mobilePushTokens.id, token: mobilePushTokens.expoToken })
        .from(mobilePushTokens)
        .where(eq(mobilePushTokens.clientId, clientId));

      if (rows.length === 0) return;

      const messages: ExpoPushMessage[] = rows.map((r) => ({
        to: r.token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }));

      const res = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.warn(`Expo push API ${res.status}: ${await res.text()}`);
        return;
      }

      const json = (await res.json()) as { data?: ExpoPushTicket[] };
      const tickets = json.data ?? [];

      // Prune tokens flagged as DeviceNotRegistered — they're permanently dead.
      const deadTokenIds: string[] = [];
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          deadTokenIds.push(rows[i].id);
        }
      });

      if (deadTokenIds.length > 0) {
        await this.db
          .delete(mobilePushTokens)
          .where(inArray(mobilePushTokens.id, deadTokenIds));
        this.logger.log(`Pruned ${deadTokenIds.length} dead push token(s)`);
      }
    } catch (err: any) {
      this.logger.error(`MobilePush.sendToClient failed: ${err.message}`);
    }
  }
}

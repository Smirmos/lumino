import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private readonly configService: ConfigService) {}

  async handleIncoming(entry: any): Promise<void> {
    const messagingEvents = entry.messaging ?? [];
    for (const event of messagingEvents) {
      if (event.message?.text) {
        this.logger.log({
          event: 'instagram_message_received',
          senderId: event.sender?.id,
          pageId: entry.id,
        });
        // Will be wired to ChatbotService in LUM-17
      }
    }
  }

  async sendReply(recipientId: string, text: string): Promise<void> {
    const accessToken = this.configService.get<string>('META_ACCESS_TOKEN');
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      });
    } catch (err: any) {
      this.logger.error('Failed to send Instagram reply', err.message);
    }
  }
}

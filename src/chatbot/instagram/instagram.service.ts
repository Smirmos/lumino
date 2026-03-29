import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ContextService } from '../../common/context.service';
import { ChatbotService } from '../chatbot.service';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly contextService: ContextService,
    @Inject(forwardRef(() => ChatbotService))
    private readonly chatbotService: ChatbotService,
  ) {}

  async handleIncoming(entry: any): Promise<void> {
    const messagingEvents = entry.messaging ?? [];
    const pageId = entry.id;

    for (const event of messagingEvents) {
      if (event.message?.text) {
        const senderId = event.sender?.id;
        this.logger.log({
          event: 'instagram_message_received',
          senderId,
          pageId,
        });

        // Resolve pageId → clientId from Redis cache
        const clientId = await this.contextService.getClientIdByPage(pageId);
        if (!clientId) {
          this.logger.warn({ event: 'instagram_client_not_found', pageId });
          continue;
        }

        await this.chatbotService.handleMessage({
          channel: 'instagram',
          clientId,
          userId: senderId,
          text: event.message.text,
        });
      }
    }
  }

  async sendReply(recipientId: string, text: string): Promise<void> {
    const accessToken = this.configService.get<string>('META_ACCESS_TOKEN');

    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
          messaging_type: 'RESPONSE',
        },
        {
          params: { access_token: accessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );
    } catch (err: any) {
      this.logger.error({
        event: 'instagram_send_failed',
        error: err.message,
        status: err.response?.status,
      });
      throw err;
    }
  }
}

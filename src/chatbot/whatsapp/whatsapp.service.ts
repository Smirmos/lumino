import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ContextService } from '../../common/context.service';
import { ChatbotService } from '../chatbot.service';

export interface WhatsappIncomingMessage {
  channel: 'whatsapp';
  phoneNumberId: string;
  customerPhone: string;
  text: string;
  messageId: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly contextService: ContextService,
    @Inject(forwardRef(() => ChatbotService))
    private readonly chatbotService: ChatbotService,
  ) {}

  async handleIncoming(message: WhatsappIncomingMessage): Promise<void> {
    this.logger.log({
      event: 'whatsapp_message_received',
      phoneNumberId: message.phoneNumberId,
      messageId: message.messageId,
    });

    // Resolve phoneNumberId → clientId from Redis cache
    const clientId = await this.contextService.getClientId(message.phoneNumberId);
    if (!clientId) {
      this.logger.warn({
        event: 'whatsapp_client_not_found',
        phoneNumberId: message.phoneNumberId,
      });
      return;
    }

    await this.chatbotService.handleMessage({
      channel: 'whatsapp',
      clientId,
      userId: message.customerPhone,
      text: message.text,
      messageId: message.messageId,
      phoneNumberId: message.phoneNumberId,
    });
  }

  async sendReply(
    customerPhone: string,
    text: string,
    phoneNumberId: string,
  ): Promise<void> {
    const accessToken = this.configService.get<string>('META_ACCESS_TOKEN');

    try {
      await axios.post(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: customerPhone,
          type: 'text',
          text: { body: text, preview_url: false },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
    } catch (err: any) {
      this.logger.error({
        event: 'whatsapp_send_failed',
        error: err.message,
        status: err.response?.status,
        detail: err.response?.data,
      });
      throw err;
    }
  }

  async sendTemplate(
    customerPhone: string,
    phoneNumberId: string,
    templateName: string,
    languageCode: string,
    bodyParams?: string[],
  ): Promise<{ success: boolean; error?: string }> {
    const accessToken = this.configService.get<string>('META_ACCESS_TOKEN');

    const components: any[] = [];
    if (bodyParams && bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParams.map(text => ({ type: 'text', text })),
      });
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: customerPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components.length > 0 ? { components } : {}),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      this.logger.error({
        event: 'whatsapp_template_send_failed',
        to: customerPhone,
        template: templateName,
        error: errorMsg,
        detail: err.response?.data,
      });
      return { success: false, error: errorMsg };
    }
  }

  async sendFallback(customerPhone: string, phoneNumberId: string): Promise<void> {
    const fallbackMessage = 'Sorry, I can only handle text messages.';
    await this.sendReply(customerPhone, fallbackMessage, phoneNumberId);
  }
}

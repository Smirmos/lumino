import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly configService: ConfigService) {}

  async handleIncoming(message: WhatsappIncomingMessage): Promise<void> {
    this.logger.log({
      event: 'whatsapp_message_received',
      phoneNumberId: message.phoneNumberId,
      messageId: message.messageId,
    });
    // Will be wired to ChatbotService in LUM-17
  }

  async sendReply(
    customerPhone: string,
    text: string,
    phoneNumberId: string,
  ): Promise<void> {
    const apiKey = this.configService.get<string>('DIALOG360_API_KEY');
    const url = 'https://waba.360dialog.io/v1/messages';

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'D360-API-KEY': apiKey ?? '',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: customerPhone,
          type: 'text',
          text: { body: text },
        }),
      });
    } catch (err: any) {
      this.logger.error('Failed to send WhatsApp reply', err.message);
    }
  }

  async sendFallback(customerPhone: string, phoneNumberId: string): Promise<void> {
    const fallbackMessage = 'Sorry, I can only handle text messages.';
    await this.sendReply(customerPhone, fallbackMessage, phoneNumberId);
  }
}

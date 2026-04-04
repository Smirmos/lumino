import { Controller, Post, Body, HttpCode, UnauthorizedException, Headers, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Db } from '../db';
import { promotions } from '../db/schema';
import { WhatsappService } from '../chatbot/whatsapp/whatsapp.service';

interface SendPromotionBody {
  promotionId: string;
  clientId: string;
  phoneNumberId: string;
  templateName: string;
  languageCode: string;
  message: string;
  recipients: Array<{ customerIdentifier: string; channel: string }>;
}

@Controller('internal/promotions')
export class InternalPromotionsController {
  private readonly logger = new Logger(InternalPromotionsController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsappService,
    @Inject('DB') private readonly db: Db,
  ) {}

  private validateSecret(secret: string) {
    const expected = this.configService.get<string>('INTERNAL_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
  }

  @Post('send')
  @HttpCode(200)
  async sendPromotion(
    @Headers('x-internal-secret') secret: string,
    @Body() body: SendPromotionBody,
  ) {
    this.validateSecret(secret);

    const { promotionId, phoneNumberId, templateName, languageCode, message, recipients } = body;

    this.logger.log({
      event: 'promotion_send_start',
      promotionId,
      recipientCount: recipients.length,
      template: templateName,
    });

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ customerIdentifier: string; status: string; error?: string }> = [];

    for (const recipient of recipients) {
      const result = await this.whatsappService.sendTemplate(
        recipient.customerIdentifier,
        phoneNumberId,
        templateName,
        languageCode,
        [message],
      );

      if (result.success) {
        sentCount++;
        results.push({ customerIdentifier: recipient.customerIdentifier, status: 'sent' });
      } else {
        failedCount++;
        results.push({ customerIdentifier: recipient.customerIdentifier, status: 'failed', error: result.error });
      }

      // Small delay between sends to avoid rate limiting
      if (recipients.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update promotion record
    await this.db.update(promotions)
      .set({
        sentCount,
        failedCount,
        status: failedCount === recipients.length ? 'failed' : 'sent',
        sentAt: new Date(),
        recipients: results,
      })
      .where(eq(promotions.id, promotionId));

    this.logger.log({
      event: 'promotion_send_complete',
      promotionId,
      sentCount,
      failedCount,
    });

    return { success: true, sentCount, failedCount };
  }
}

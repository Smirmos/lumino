import {
  Controller,
  Get,
  Post,
  Req,
  Query,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { WhatsappService } from './whatsapp.service';

@Controller('webhooks/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  /** Webhook verification — Meta sends a GET to verify the endpoint */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expectedToken = this.configService.get<string>('META_VERIFY_TOKEN');

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log({ event: 'whatsapp_webhook_verified' });
      return challenge;
    }

    this.logger.warn({ event: 'whatsapp_webhook_verification_failed', mode });
    return 'Forbidden';
  }

  @Post()
  @HttpCode(200)
  handleWebhook(@Req() req: Request) {
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody = (req as any).rawBody as Buffer;

    if (signature && rawBody && !this.verifySignature(rawBody, signature)) {
      this.logger.warn('Invalid X-Hub-Signature-256');
      return { status: 'ok' };
    }

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') {
      return { status: 'ok' };
    }

    const entries = body.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        const value = change.value;
        if (!value?.messages || value.messages.length === 0) {
          continue; // Status update, skip
        }

        const phoneNumberId = value.metadata?.phone_number_id;

        for (const message of value.messages) {
          if (message.type === 'text' && message.text?.body) {
            setImmediate(() => {
              this.whatsappService
                .handleIncoming({
                  channel: 'whatsapp',
                  phoneNumberId,
                  customerPhone: message.from,
                  text: message.text.body,
                  messageId: message.id,
                })
                .catch((err: Error) => {
                  this.logger.error('Error handling WhatsApp message', err.message);
                });
            });
          } else {
            // Non-text message: send fallback
            setImmediate(() => {
              this.whatsappService
                .sendFallback(message.from, phoneNumberId)
                .catch((err: Error) => {
                  this.logger.error('Error sending fallback', err.message);
                });
            });
          }
        }
      }
    }

    return { status: 'ok' };
  }

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    try {
      const secret = this.configService.get<string>('META_APP_SECRET');
      if (!secret) return true; // Skip verification if secret not set

      const expectedSig = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

      if (expectedSig.length !== signature.length) return false;

      return timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}

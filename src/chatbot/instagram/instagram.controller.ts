import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { InstagramService } from './instagram.service';

@Controller('webhooks/instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(
    private readonly instagramService: InstagramService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = this.configService.get<string>('META_VERIFY_TOKEN');

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log('Instagram webhook verified');
      return res.status(200).send(challenge);
    }

    this.logger.warn('Instagram webhook verification failed');
    return res.status(403).send('Forbidden');
  }

  @Post()
  @HttpCode(200)
  handleWebhook(@Req() req: Request) {
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody = (req as any).rawBody as Buffer;

    if (!signature || !rawBody || !this.verifySignature(rawBody, signature)) {
      this.logger.warn('Invalid or missing X-Hub-Signature-256');
      return { status: 'ok' };
    }

    const body = req.body;
    if (body.object !== 'instagram') {
      return { status: 'ok' };
    }

    const entries = body.entry ?? [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging ?? [];
      for (const event of messagingEvents) {
        if (event.message?.text) {
          setImmediate(() => {
            this.instagramService.handleIncoming(entry).catch((err: Error) => {
              this.logger.error('Error handling Instagram message', err.message);
            });
          });
        }
      }
    }

    return { status: 'ok' };
  }

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    try {
      const appSecret = this.configService.get<string>('META_APP_SECRET');
      if (!appSecret) return false;

      const expected =
        'sha256=' +
        createHmac('sha256', appSecret).update(rawBody).digest('hex');

      if (expected.length !== signature.length) return false;

      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}

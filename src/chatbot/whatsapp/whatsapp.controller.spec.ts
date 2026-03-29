import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'crypto';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { ConfigService } from '@nestjs/config';

describe('WhatsappController', () => {
  let app: INestApplication;
  let whatsappService: { handleIncoming: jest.Mock; sendFallback: jest.Mock };
  const testSecret = 'test_webhook_secret';

  beforeAll(async () => {
    whatsappService = {
      handleIncoming: jest.fn().mockResolvedValue(undefined),
      sendFallback: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        { provide: WhatsappService, useValue: whatsappService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'DIALOG360_WEBHOOK_SECRET') return testSecret;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    // Add raw body middleware to match main.ts setup
    app.use(require('body-parser').json({
      verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function signPayload(body: string): string {
    return createHmac('sha256', testSecret).update(body).digest('hex');
  }

  describe('POST /webhooks/whatsapp', () => {
    it('returns 200 for status update events (no messages)', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone1' },
              statuses: [{ id: 'msg1', status: 'delivered' }],
            },
            field: 'messages',
          }],
        }],
      };
      const body = JSON.stringify(payload);
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);
    });

    it('returns 200 and calls handleIncoming for text message', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone1' },
              messages: [{ from: '972501234567', id: 'wamid.1', type: 'text', text: { body: 'Hello' } }],
            },
            field: 'messages',
          }],
        }],
      };
      const body = JSON.stringify(payload);
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(whatsappService.handleIncoming).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'whatsapp',
          phoneNumberId: 'phone1',
          customerPhone: '972501234567',
          text: 'Hello',
        }),
      );
    });

    it('returns 200 and calls sendFallback for image message', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone1' },
              messages: [{ from: '972501234567', id: 'wamid.2', type: 'image', image: {} }],
            },
            field: 'messages',
          }],
        }],
      };
      const body = JSON.stringify(payload);
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(whatsappService.sendFallback).toHaveBeenCalledWith('972501234567', 'phone1');
    });

    it('returns 200 and calls sendFallback for voice message', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone1' },
              messages: [{ from: '972501234567', id: 'wamid.3', type: 'voice', voice: {} }],
            },
            field: 'messages',
          }],
        }],
      };
      const body = JSON.stringify(payload);
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(whatsappService.sendFallback).toHaveBeenCalled();
    });

    it('returns 200 and calls sendFallback for sticker message', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone1' },
              messages: [{ from: '972501234567', id: 'wamid.4', type: 'sticker', sticker: {} }],
            },
            field: 'messages',
          }],
        }],
      };
      const body = JSON.stringify(payload);
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(whatsappService.sendFallback).toHaveBeenCalled();
    });

    it('does NOT call handleIncoming when D360-Signature is invalid', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone1' },
              messages: [{ from: '972501234567', id: 'wamid.5', type: 'text', text: { body: 'Hi' } }],
            },
            field: 'messages',
          }],
        }],
      };

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', 'invalid_signature')
        .send(payload)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(whatsappService.handleIncoming).not.toHaveBeenCalled();
    });

    it('extracts phone_number_id from metadata', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'my_phone_id_123' },
              messages: [{ from: '972501234567', id: 'wamid.6', type: 'text', text: { body: 'Test' } }],
            },
            field: 'messages',
          }],
        }],
      };
      const body = JSON.stringify(payload);
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(whatsappService.handleIncoming).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumberId: 'my_phone_id_123' }),
      );
    });

    it('handles multiple messages in single payload', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'phone1' },
              messages: [
                { from: '972501234567', id: 'wamid.7', type: 'text', text: { body: 'msg1' } },
                { from: '972509876543', id: 'wamid.8', type: 'text', text: { body: 'msg2' } },
              ],
            },
            field: 'messages',
          }],
        }],
      };
      const body = JSON.stringify(payload);
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(whatsappService.handleIncoming).toHaveBeenCalledTimes(2);
    });

    it('returns 200 for invalid signature', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('d360-signature', 'bad')
        .send({ object: 'whatsapp_business_account', entry: [] })
        .expect(200);
    });
  });
});

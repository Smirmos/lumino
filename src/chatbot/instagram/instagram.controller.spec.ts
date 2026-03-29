import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'crypto';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { ConfigService } from '@nestjs/config';

describe('InstagramController', () => {
  let app: INestApplication;
  let instagramService: { handleIncoming: jest.Mock };
  const testSecret = 'test_app_secret';
  const testVerifyToken = 'test_verify_token';

  beforeAll(async () => {
    instagramService = { handleIncoming: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstagramController],
      providers: [
        { provide: InstagramService, useValue: instagramService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'META_VERIFY_TOKEN') return testVerifyToken;
              if (key === 'META_APP_SECRET') return testSecret;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
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
    return 'sha256=' + createHmac('sha256', testSecret).update(body).digest('hex');
  }

  describe('GET /webhooks/instagram (verification)', () => {
    it('returns 200 + challenge when mode=subscribe and token matches', () => {
      return request(app.getHttpServer())
        .get('/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': testVerifyToken,
          'hub.challenge': 'test_challenge_123',
        })
        .expect(200)
        .expect('test_challenge_123');
    });

    it('returns 403 when verify_token is wrong', () => {
      return request(app.getHttpServer())
        .get('/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'test',
        })
        .expect(403);
    });

    it('returns 403 when hub.mode is not "subscribe"', () => {
      return request(app.getHttpServer())
        .get('/webhooks/instagram')
        .query({
          'hub.mode': 'unsubscribe',
          'hub.verify_token': testVerifyToken,
          'hub.challenge': 'test',
        })
        .expect(403);
    });

    it('returns 403 when hub.verify_token is missing', () => {
      return request(app.getHttpServer())
        .get('/webhooks/instagram')
        .query({ 'hub.mode': 'subscribe', 'hub.challenge': 'test' })
        .expect(403);
    });

    it('returns exact challenge string as plain text body', async () => {
      const res = await request(app.getHttpServer())
        .get('/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': testVerifyToken,
          'hub.challenge': 'exact_challenge_string_456',
        })
        .expect(200);
      expect(res.text).toBe('exact_challenge_string_456');
    });
  });

  describe('POST /webhooks/instagram (message events)', () => {
    it('always returns 200 even on HMAC failure', () => {
      return request(app.getHttpServer())
        .post('/webhooks/instagram')
        .set('x-hub-signature-256', 'sha256=invalid')
        .send({ object: 'instagram', entry: [] })
        .expect(200);
    });

    it('always returns 200 when payload has no messages', async () => {
      const body = JSON.stringify({ object: 'instagram', entry: [] });
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/instagram')
        .set('x-hub-signature-256', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);
    });

    it('does NOT call handleIncoming when X-Hub-Signature-256 is missing', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/instagram')
        .send({
          object: 'instagram',
          entry: [{ id: 'page1', messaging: [{ sender: { id: 'u1' }, message: { text: 'Hi' } }] }],
        })
        .expect(200);

      // Wait for setImmediate
      await new Promise((r) => setTimeout(r, 50));
      expect(instagramService.handleIncoming).not.toHaveBeenCalled();
    });

    it('does NOT call handleIncoming when X-Hub-Signature-256 is invalid', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/instagram')
        .set('x-hub-signature-256', 'sha256=0000000000')
        .send({
          object: 'instagram',
          entry: [{ id: 'page1', messaging: [{ sender: { id: 'u1' }, message: { text: 'Hi' } }] }],
        })
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(instagramService.handleIncoming).not.toHaveBeenCalled();
    });

    it('does NOT call handleIncoming for delivery receipt', async () => {
      const body = JSON.stringify({
        object: 'instagram',
        entry: [{ id: 'page1', messaging: [{ sender: { id: 'u1' }, delivery: { mids: ['m1'] } }] }],
      });
      const sig = signPayload(body);

      await request(app.getHttpServer())
        .post('/webhooks/instagram')
        .set('x-hub-signature-256', sig)
        .set('content-type', 'application/json')
        .send(body)
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));
      expect(instagramService.handleIncoming).not.toHaveBeenCalled();
    });
  });
});

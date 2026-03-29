import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { ChatbotModule } from './chatbot/chatbot.module';
import { HealthController } from './health/health.controller';
import { DbModule } from './db/db.module';
import { RedisModule } from './common/redis.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers["x-api-key"]',
            'req.body.text',
            'req.body.systemPrompt',
            '*.apiKey',
            '*.password',
            '*.token',
          ],
          censor: '[REDACTED]',
        },
        serializers: {
          req: (req: any) => ({
            method: req.method,
            url: req.url,
            requestId: req.id,
          }),
          res: (res: any) => ({ statusCode: res.statusCode }),
        },
        genReqId: (req: any) => req.headers['x-request-id'] || randomUUID(),
        customProps: () => ({ service: 'lumino-chatbot' }),
      },
    }),
    DbModule,
    RedisModule,
    ChatbotModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

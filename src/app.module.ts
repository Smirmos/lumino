import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { ChatbotModule } from './chatbot/chatbot.module';
import { HealthController } from './health/health.controller';
import { DbModule } from './db/db.module';
import { RedisModule } from './common/redis.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AlertService } from './common/alert.service';
import { AlertSchedulerService } from './common/alert-scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
  providers: [AlertService, AlertSchedulerService],
  exports: [AlertService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

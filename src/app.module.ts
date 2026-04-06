import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ContactModule } from './contact/contact.module';
import { EscalationNotifierModule } from './common/escalation-notifier.module';
import { HealthController } from './health/health.controller';
import { DbModule } from './db/db.module';
import { RedisModule } from './common/redis.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AlertService } from './common/alert.service';
import { AlertSchedulerService } from './common/alert-scheduler.service';
import { UsageRollupService } from './common/usage-rollup.service';
import { SummarizationService } from './common/summarization.service';
import { InternalCacheController } from './common/internal-cache.controller';
import { InternalEmailController } from './common/internal-email.controller';
import { InternalPromotionsController } from './common/internal-promotions.controller';
import { InternalWhatsappController } from './common/internal-whatsapp.controller';
import { EmailService } from './common/email.service';

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
    ContactModule,
    EscalationNotifierModule,
  ],
  controllers: [HealthController, InternalCacheController, InternalEmailController, InternalPromotionsController, InternalWhatsappController],
  providers: [AlertService, AlertSchedulerService, UsageRollupService, SummarizationService, EmailService],
  exports: [AlertService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

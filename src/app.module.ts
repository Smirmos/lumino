import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ChatbotModule } from './chatbot/chatbot.module';
import { HealthController } from './health/health.controller';
import { DbModule } from './db/db.module';
import { RedisModule } from './common/redis.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            configService.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
              : undefined,
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
          genReqId: (req: any) =>
            req.headers['x-request-id'] || require('crypto').randomUUID(),
          customProps: () => ({ service: 'lumino-chatbot' }),
        },
      }),
      inject: [ConfigService],
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

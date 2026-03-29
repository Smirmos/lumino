import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotModule } from './chatbot/chatbot.module';
import { HealthController } from './health/health.controller';
import { DbModule } from './db/db.module';
import { RedisModule } from './common/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    RedisModule,
    ChatbotModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

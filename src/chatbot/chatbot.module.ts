import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { InstagramController } from './instagram/instagram.controller';
import { InstagramService } from './instagram/instagram.service';
import { WhatsappController } from './whatsapp/whatsapp.controller';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { ClientConfigService } from './clients/client-config.service';
import { ClaudeService } from '../common/claude.service';
import { ContextService } from '../common/context.service';
import { UsageService } from '../common/usage.service';
import { SecurityService } from './security/security.service';
import { RateLimiterService } from './security/rate-limiter.service';
import { EscalationNotifierModule } from '../common/escalation-notifier.module';

@Module({
  imports: [EscalationNotifierModule],
  controllers: [InstagramController, WhatsappController],
  providers: [
    ChatbotService,
    InstagramService,
    WhatsappService,
    ClientConfigService,
    ClaudeService,
    ContextService,
    UsageService,
    SecurityService,
    RateLimiterService,
  ],
  exports: [ChatbotService, ClientConfigService],
})
export class ChatbotModule {}

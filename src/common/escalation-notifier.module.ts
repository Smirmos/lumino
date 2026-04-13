import { Module } from '@nestjs/common';
import { EscalationNotifierService } from './escalation-notifier.service';
import { MobilePushService } from './mobile-push.service';

@Module({
  providers: [EscalationNotifierService, MobilePushService],
  exports: [EscalationNotifierService, MobilePushService],
})
export class EscalationNotifierModule {}

import { Module } from '@nestjs/common';
import { EscalationNotifierService } from './escalation-notifier.service';

@Module({
  providers: [EscalationNotifierService],
  exports: [EscalationNotifierService],
})
export class EscalationNotifierModule {}

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as Sentry from '@sentry/nestjs';
import { ClaudeService } from '../common/claude.service';
import { ContextService } from '../common/context.service';
import { UsageService } from '../common/usage.service';
import { ClientConfigService } from './clients/client-config.service';
import { SecurityService } from './security/security.service';
import { RateLimiterService } from './security/rate-limiter.service';
import { InstagramService } from './instagram/instagram.service';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { ChatbotRequestLog, ChatbotSecurityLog } from '../common/types/log.types';

export interface HandleMessageInput {
  channel: 'instagram' | 'whatsapp';
  clientId: string;
  userId: string;
  text: string;
  messageId?: string;
  phoneNumberId?: string;
}

export interface HandleMessageOutput {
  reply: string;
  escalated: boolean;
  status: 'success' | 'fallback' | 'blocked' | 'rate_limited';
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly contextService: ContextService,
    private readonly usageService: UsageService,
    private readonly clientConfigService: ClientConfigService,
    private readonly securityService: SecurityService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly instagramService: InstagramService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async handleMessage(input: HandleMessageInput): Promise<HandleMessageOutput> {
    // Step 1: Hash userId
    const hashedUserId = createHash('sha256').update(input.userId).digest('hex');

    const start = Date.now();

    this.logger.log({
      event: 'chatbot_request_start',
      clientId: input.clientId,
      channel: input.channel,
      userId: hashedUserId,
      messageLength: input.text.length,
    });

    // Step 2: Check blocklist
    if (await this.securityService.checkBlocklist(hashedUserId, input.clientId)) {
      const secLog: ChatbotSecurityLog = {
        event: 'user_blocked',
        clientId: input.clientId,
        userId: hashedUserId,
        channel: input.channel,
        reason: 'blocklist',
      };
      this.logger.warn(secLog);
      return { reply: '', escalated: false, status: 'blocked', inputTokens: 0, outputTokens: 0 };
    }

    // Step 3: Validate message
    if (!this.securityService.validateMessage(input.text)) {
      return { reply: '', escalated: false, status: 'blocked', inputTokens: 0, outputTokens: 0 };
    }

    // Step 4: Check injection
    if (this.securityService.scanInjection(input.text)) {
      void this.securityService.recordInjectionAttempt(hashedUserId, input.clientId);
      const secLog: ChatbotSecurityLog = {
        event: 'injection_detected',
        clientId: input.clientId,
        userId: hashedUserId,
        channel: input.channel,
        reason: 'prompt_injection_pattern',
      };
      this.logger.warn(secLog);
      return {
        reply: 'I can only help with business questions.',
        escalated: false,
        status: 'blocked',
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    // Step 5: Check rate limit
    if (await this.rateLimiterService.isRateLimited(hashedUserId, input.clientId)) {
      const secLog: ChatbotSecurityLog = {
        event: 'rate_limited',
        clientId: input.clientId,
        userId: hashedUserId,
        channel: input.channel,
        reason: 'user_rate_limit_exceeded',
      };
      this.logger.warn(secLog);
      return { reply: '', escalated: false, status: 'rate_limited', inputTokens: 0, outputTokens: 0 };
    }

    // Step 6: Fetch client config
    const client = await this.clientConfigService.getClientConfig(input.clientId);
    if (!client.isActive) {
      return { reply: '', escalated: false, status: 'blocked', inputTokens: 0, outputTokens: 0 };
    }

    // Set Sentry context for this request
    Sentry.setTag('clientId', input.clientId);
    Sentry.setTag('channel', input.channel);
    Sentry.setUser({ id: hashedUserId });

    // Step 7: Acquire Redis lock
    const locked = await this.contextService.acquireLock(input.channel, hashedUserId, input.clientId);
    if (!locked) {
      return { reply: '', escalated: false, status: 'rate_limited', inputTokens: 0, outputTokens: 0 };
    }

    try {
      // Step 8: Upsert conversation (fire and forget)
      void this.usageService.upsertConversation(input.clientId, input.channel, hashedUserId);

      // Step 9: Persist user message (fire and forget)
      void this.usageService.persistMessage(input.clientId, input.channel, hashedUserId, 'user', input.text);

      // Step 10: Load context
      const history = await this.contextService.getContext(input.channel, hashedUserId, input.clientId);

      // Step 11: Build system prompt
      const systemPrompt = this.clientConfigService.buildSystemPrompt(client);

      // Step 12: Call Claude
      let result;
      try {
        result = await this.claudeService.generateReply({
          systemPrompt,
          messages: [...history, { role: 'user', content: input.text }],
        });
      } catch (err: any) {
        this.logger.error({
          event: 'claude_error',
          clientId: input.clientId,
          error: process.env.NODE_ENV === 'production' ? err.message : err.stack,
          latencyMs: Date.now() - start,
        });
        const fallbackReply = this.claudeService.generateFallbackReply('en');
        return {
          reply: fallbackReply,
          escalated: false,
          status: 'fallback',
          inputTokens: 0,
          outputTokens: 0,
        };
      }

      // Step 13: Persist assistant message (fire and forget)
      void this.usageService.persistMessage(
        input.clientId,
        input.channel,
        hashedUserId,
        'assistant',
        result.text,
        result.inputTokens,
        result.outputTokens,
      );

      // Step 14: Append both messages to Redis context
      await this.contextService.appendMessage(input.channel, hashedUserId, input.clientId, {
        role: 'user',
        content: input.text,
      });
      await this.contextService.appendMessage(input.channel, hashedUserId, input.clientId, {
        role: 'assistant',
        content: result.text,
      });

      // Step 15: Detect escalation
      const shouldEscalate =
        result.text.includes('[ESCALATE]') ||
        this.securityService.checkEscalationKeywords(input.text, client.escalationKeywords);
      const cleanReply = result.text.replace('[ESCALATE]', '').trim();

      if (shouldEscalate) {
        void this.usageService.markEscalated(input.clientId, input.channel, hashedUserId);
      }

      // Step 16: Send reply via channel API
      if (input.channel === 'instagram') {
        await this.instagramService.sendReply(input.userId, cleanReply);
      } else if (input.channel === 'whatsapp') {
        await this.whatsappService.sendReply(input.userId, cleanReply, input.phoneNumberId ?? '');
      }

      // Step 18: Record usage (fire and forget)
      void this.usageService.record({
        clientId: input.clientId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        channel: input.channel,
      });

      // Increment rate limit counters
      void this.rateLimiterService.incrementCounters(hashedUserId, input.clientId);
      void this.rateLimiterService.incrementClientCounter(input.clientId);

      const requestLog: ChatbotRequestLog = {
        event: 'chatbot_request',
        clientId: input.clientId,
        channel: input.channel,
        userId: hashedUserId,
        messageLength: input.text.length,
        model: 'claude-haiku-4-5',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: Date.now() - start,
        status: 'success',
        escalated: shouldEscalate,
      };
      this.logger.log(requestLog);

      return {
        reply: cleanReply,
        escalated: shouldEscalate,
        status: 'success',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    } finally {
      // Step 17: Release Redis lock (always, even on error)
      await this.contextService.releaseLock(input.channel, hashedUserId, input.clientId);
    }
  }
}

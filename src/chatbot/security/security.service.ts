import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

const INJECTION_PATTERNS = [
  'ignore previous', 'ignore all previous', 'ignore your instructions',
  'new instructions', 'your new instructions',
  'system prompt', 'your system prompt', 'show me your prompt',
  'what is your prompt', 'what were you told', 'repeat your instructions',
  'repeat everything above', 'print your instructions',
  'act as', 'you are now', 'pretend you are', 'pretend to be',
  'roleplay as', 'your new role',
  'DAN', 'jailbreak', 'developer mode',
  'forget everything', 'disregard', 'override',
];

const ESCALATION_KEYWORDS: Record<string, string[]> = {
  he: [
    'מנהל', 'החזר כספי', 'תביעה', 'עורך דין', 'תלונה', 'לא מקובל', 'שערוריה',
    'תקשר אותי', 'לדבר עם אדם', 'נציג אנושי', 'בן אדם אמיתי', 'תעביר אותי',
  ],
  ru: [
    'менеджер', 'возврат', 'жалоба', 'судиться', 'недопустимо', 'претензия', 'скандал',
    'позови человека', 'живой человек', 'оператор', 'хочу с человеком', 'переключи на человека',
    'не хочу с ботом', 'больше не напишу',
  ],
  en: [
    'manager', 'refund', 'lawsuit', 'complaint', 'unacceptable', 'legal action', 'escalate',
    'talk to a human', 'real person', 'speak to someone', 'connect me', 'transfer me',
    'not a bot', 'live agent',
  ],
};

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  validateMessage(text: string): boolean {
    if (!text || text.trim().length === 0) return false;
    if (text.length > 600) return false;
    return true;
  }

  scanInjection(text: string): boolean {
    const lower = text.toLowerCase();
    return INJECTION_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
  }

  checkEscalationKeywords(text: string, customKeywords: string[] | null): boolean {
    const lower = text.toLowerCase();

    // Check all language keywords
    for (const lang of Object.values(ESCALATION_KEYWORDS)) {
      for (const keyword of lang) {
        if (lower.includes(keyword.toLowerCase())) return true;
      }
    }

    // Check custom keywords
    if (customKeywords) {
      for (const keyword of customKeywords) {
        if (lower.includes(keyword.toLowerCase())) return true;
      }
    }

    // All caps anger signal (only for messages > 200 chars)
    if (text.length > 200 && text === text.toUpperCase()) return true;

    return false;
  }

  async checkBlocklist(userId: string, clientId: string): Promise<boolean> {
    const result = await this.redis.get(`block:${clientId}:${userId}`);
    return result !== null;
  }

  async isBlocklisted(userId: string, clientId: string): Promise<boolean> {
    return this.checkBlocklist(userId, clientId);
  }

  async recordInjectionAttempt(userId: string, clientId: string): Promise<void> {
    const key = `inject_attempts:${clientId}:${userId}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 86400);
    }

    if (count >= 3) {
      await this.redis.set(`block:${clientId}:${userId}`, '1', 'EX', 604800);
      this.logger.warn({ event: 'user_blocked', userId, clientId, reason: 'injection_attempts' });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { GenerateReplyInput, GenerateReplyOutput } from './types/claude.types';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const model = 'claude-haiku-4-5';
    const maxTokens = 300;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const start = Date.now();
        const response = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          system: input.systemPrompt,
          messages: input.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        const latencyMs = Date.now() - start;
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;

        this.logger.log({ model, inputTokens, outputTokens, latencyMs });

        return { text, inputTokens, outputTokens, latencyMs };
      } catch (err: any) {
        lastError = err;

        const isRateLimit = err?.status === 429;
        const isOverloaded = err?.status === 529;

        if (!isRateLimit && !isOverloaded) {
          this.logger.error({ error: err.message });
          throw err;
        }

        const waitMs = Math.pow(2, attempt) * 1000;
        this.logger.warn({ attempt: attempt + 1, waitMs });
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    this.logger.error({ error: lastError?.message });
    throw lastError;
  }

  generateFallbackReply(language: 'he' | 'ru' | 'en'): string {
    const fallbacks: Record<string, string> = {
      he: 'מצטערים, אירעה תקלה זמנית. אנא נסו שוב בעוד כמה דקות.',
      ru: 'Извините, произошла временная ошибка. Пожалуйста, попробуйте снова через несколько минут.',
      en: 'Sorry, a temporary error occurred. Please try again in a few minutes.',
    };
    return fallbacks[language] ?? fallbacks.en;
  }
}

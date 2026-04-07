import { ClaudeService } from './claude.service';
import { ConfigService } from '@nestjs/config';

// Mock the Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

describe('ClaudeService', () => {
  let service: ClaudeService;
  let mockConfigService: Partial<ConfigService>;
  const mockLogFn = jest.fn();
  const mockWarnFn = jest.fn();
  const mockErrorFn = jest.fn();

  const successResponse = {
    content: [{ type: 'text' as const, text: 'Hello! How can I help?' }],
    usage: { input_tokens: 50, output_tokens: 20 },
    stop_reason: 'end_turn',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    service = new ClaudeService(mockConfigService as ConfigService);
    (service as any).logger = { log: mockLogFn, warn: mockWarnFn, error: mockErrorFn };

    mockCreate.mockResolvedValue(successResponse);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateReply() — success path', () => {
    it('calls anthropic.messages.create with model claude-haiku-4-5', async () => {
      await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-4-5' }),
      );
    });

    it('always enforces max_tokens: 350', async () => {
      await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 350 }),
      );
    });

    it('passes systemPrompt as system parameter', async () => {
      await service.generateReply({ systemPrompt: 'You are helpful', messages: [] });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ system: 'You are helpful' }),
      );
    });

    it('passes messages array as messages parameter', async () => {
      const msgs = [{ role: 'user' as const, content: 'Hi' }];
      await service.generateReply({ systemPrompt: 'test', messages: msgs });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      );
    });

    it('returns text from response.content[0].text', async () => {
      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.text).toBe('Hello! How can I help?');
    });

    it('returns inputTokens from response.usage.input_tokens', async () => {
      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.inputTokens).toBe(50);
    });

    it('returns outputTokens from response.usage.output_tokens', async () => {
      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.outputTokens).toBe(20);
    });

    it('returns latencyMs as positive number', async () => {
      jest.useRealTimers();
      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('latencyMs reflects actual time elapsed', async () => {
      jest.useRealTimers();
      mockCreate.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(successResponse), 10)));
      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.latencyMs).toBeGreaterThanOrEqual(5);
    });
  });

  describe('generateReply() — truncation handling', () => {
    it('appends contact info when response is truncated (stop_reason: max_tokens)', async () => {
      jest.useRealTimers();
      mockCreate.mockResolvedValue({
        content: [{ type: 'text' as const, text: 'Our plans start at 300₪. Contact us at hello@lumino' }],
        usage: { input_tokens: 50, output_tokens: 350 },
        stop_reason: 'max_tokens',
      });

      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.text).toContain('hello@luminoai.co.il');
      expect(result.text).toContain('luminoai.co.il');
    });

    it('trims to last complete sentence when truncated', async () => {
      jest.useRealTimers();
      mockCreate.mockResolvedValue({
        content: [{ type: 'text' as const, text: 'We have three plans. Standard costs 300₪. PRO costs 500₪. Contact us at hello@lum' }],
        usage: { input_tokens: 50, output_tokens: 350 },
        stop_reason: 'max_tokens',
      });

      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.text).toContain('PRO costs 500₪.');
      expect(result.text).not.toContain('Contact us at hello@lum');
    });

    it('does NOT append contact info when response completes normally', async () => {
      jest.useRealTimers();
      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.text).toBe('Hello! How can I help?');
      expect(result.text).not.toContain('luminoai.co.il');
    });
  });

  describe('generateReply() — retry logic', () => {
    // Override setTimeout to resolve immediately for retry tests
    let originalSetTimeout: typeof setTimeout;

    beforeEach(() => {
      jest.useRealTimers();
      originalSetTimeout = global.setTimeout;
      // Make setTimeout resolve instantly so retries are fast
      (global as any).setTimeout = (fn: Function, _ms?: number) => originalSetTimeout(fn, 0);
    });

    afterEach(() => {
      global.setTimeout = originalSetTimeout;
    });

    it('retries on 429 RateLimitError — attempts call 3 times total', async () => {
      const rateLimitError = { status: 429, message: 'Rate limited' };
      mockCreate.mockRejectedValue(rateLimitError);

      await expect(
        service.generateReply({ systemPrompt: 'test', messages: [] }),
      ).rejects.toEqual(rateLimitError);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('retries on 529 overloaded error', async () => {
      const overloadedError = { status: 529, message: 'Overloaded' };
      mockCreate.mockRejectedValue(overloadedError);

      await expect(
        service.generateReply({ systemPrompt: 'test', messages: [] }),
      ).rejects.toEqual(overloadedError);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('does NOT retry on 400 BadRequestError — throws immediately', async () => {
      const badRequestError = { status: 400, message: 'Bad request' };
      mockCreate.mockRejectedValue(badRequestError);

      await expect(
        service.generateReply({ systemPrompt: 'test', messages: [] }),
      ).rejects.toEqual(badRequestError);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 500 InternalServerError — throws immediately', async () => {
      const serverError = { status: 500, message: 'Internal error' };
      mockCreate.mockRejectedValue(serverError);

      await expect(
        service.generateReply({ systemPrompt: 'test', messages: [] }),
      ).rejects.toEqual(serverError);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('throws last error after 3 failed attempts on rate limit', async () => {
      const rateLimitError = { status: 429, message: 'Rate limited' };
      mockCreate.mockRejectedValue(rateLimitError);

      await expect(
        service.generateReply({ systemPrompt: 'test', messages: [] }),
      ).rejects.toEqual(rateLimitError);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('succeeds on 2nd attempt after 1 rate limit error', async () => {
      const rateLimitError = { status: 429, message: 'Rate limited' };
      mockCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(result.text).toBe('Hello! How can I help?');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateFallbackReply()', () => {
    it('returns Hebrew string for language "he"', () => {
      const result = service.generateFallbackReply('he');
      expect(result).toMatch(/[\u0590-\u05FF]/);
    });

    it('returns Russian string for language "ru"', () => {
      const result = service.generateFallbackReply('ru');
      expect(result).toMatch(/[\u0400-\u04FF]/);
    });

    it('returns English string for language "en"', () => {
      const result = service.generateFallbackReply('en');
      expect(result).toContain('Sorry');
    });

    it('returned strings are non-empty', () => {
      expect(service.generateFallbackReply('he').length).toBeGreaterThan(0);
      expect(service.generateFallbackReply('ru').length).toBeGreaterThan(0);
      expect(service.generateFallbackReply('en').length).toBeGreaterThan(0);
    });
  });

  describe('logging', () => {
    it('logs success with model, inputTokens, outputTokens, latencyMs', async () => {
      jest.useRealTimers();
      await service.generateReply({ systemPrompt: 'test', messages: [] });
      expect(mockLogFn).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-4-5',
          inputTokens: 50,
          outputTokens: 20,
        }),
      );
    });

    it('NEVER logs system prompt content', async () => {
      jest.useRealTimers();
      await service.generateReply({ systemPrompt: 'SECRET PROMPT', messages: [] });
      const allLogCalls = [...mockLogFn.mock.calls, ...mockWarnFn.mock.calls, ...mockErrorFn.mock.calls];
      const allArgs = JSON.stringify(allLogCalls);
      expect(allArgs).not.toContain('SECRET PROMPT');
    });

    it('NEVER logs message content', async () => {
      jest.useRealTimers();
      await service.generateReply({
        systemPrompt: 'test',
        messages: [{ role: 'user', content: 'MY SECRET MESSAGE' }],
      });
      const allLogCalls = [...mockLogFn.mock.calls, ...mockWarnFn.mock.calls, ...mockErrorFn.mock.calls];
      const allArgs = JSON.stringify(allLogCalls);
      expect(allArgs).not.toContain('MY SECRET MESSAGE');
    });

    it('logs warning with attempt number on rate limit retry', async () => {
      jest.useRealTimers();
      const originalST = global.setTimeout;
      (global as any).setTimeout = (fn: Function) => originalST(fn, 0);

      const rateLimitError = { status: 429, message: 'Rate limited' };
      mockCreate.mockRejectedValue(rateLimitError);

      await service.generateReply({ systemPrompt: 'test', messages: [] }).catch(() => {});

      global.setTimeout = originalST;

      expect(mockWarnFn).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1 }),
      );
    });

    it('logs error message on final failure', async () => {
      jest.useRealTimers();
      const originalST = global.setTimeout;
      (global as any).setTimeout = (fn: Function) => originalST(fn, 0);

      const rateLimitError = { status: 429, message: 'Rate limited' };
      mockCreate.mockRejectedValue(rateLimitError);

      await service.generateReply({ systemPrompt: 'test', messages: [] }).catch(() => {});

      global.setTimeout = originalST;

      expect(mockErrorFn).toHaveBeenCalled();
    });
  });
});

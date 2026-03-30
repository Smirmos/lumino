import { ClientConfigService } from './client-config.service';
import { ClientConfig } from './types/client-config.types';
import {
  createHebrewClient,
  createRussianClient,
  createMultiLangClient,
} from '../../../test/fixtures/client-config.fixture';

describe('ClientConfigService', () => {
  let service: ClientConfigService;
  let hebrewClient: ClientConfig;
  let russianClient: ClientConfig;
  let multiLangClient: ClientConfig;
  const mockWarnFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    service = Object.create(ClientConfigService.prototype);
    (service as any).logger = { warn: mockWarnFn, error: jest.fn(), log: jest.fn() };
    (service as any).db = {};
    (service as any).redis = {};
    hebrewClient = createHebrewClient();
    russianClient = createRussianClient();
    multiLangClient = createMultiLangClient();
  });

  describe('Section presence — ALL 7 sections must exist', () => {
    let prompt: string;
    beforeEach(() => {
      prompt = service.buildSystemPrompt(hebrewClient);
    });

    it('contains ## IDENTITY section', () => {
      expect(prompt).toContain('## IDENTITY');
    });
    it('contains ## BUSINESS INFORMATION section', () => {
      expect(prompt).toContain('## BUSINESS INFORMATION');
    });
    it('contains ## LANGUAGE section', () => {
      expect(prompt).toContain('## LANGUAGE');
    });
    it('contains ## TONE & STYLE section', () => {
      expect(prompt).toContain('## TONE & STYLE');
    });
    it('contains ## WHAT YOU CAN AND CANNOT DO section', () => {
      expect(prompt).toContain('## WHAT YOU CAN AND CANNOT DO');
    });
    it('contains ## ESCALATION section', () => {
      expect(prompt).toContain('## ESCALATION');
    });
    it('contains ## SECURITY section', () => {
      expect(prompt).toContain('## SECURITY');
    });
  });

  describe('IDENTITY section', () => {
    it('contains businessName in identity section', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain(hebrewClient.businessName);
    });
    it('[fixture1] contains "מספרה דנה"', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('מספרה דנה');
    });
    it('[fixture2] contains "Студия красоты Анна"', () => {
      const prompt = service.buildSystemPrompt(russianClient);
      expect(prompt).toContain('Студия красоты Анна');
    });
  });

  describe('BUSINESS INFORMATION section', () => {
    it('contains services text', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain(hebrewClient.services);
    });
    it('contains pricing when provided', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain(hebrewClient.pricing!);
    });
    it('[fixture2] contains fallback text when pricing is null', () => {
      const prompt = service.buildSystemPrompt(russianClient);
      expect(prompt).toContain('Please contact us for pricing information');
    });
    it('contains booking URL when canBook is true', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain(hebrewClient.bookingUrl!);
    });
    it('[fixture2] does NOT contain booking link when canBook is false', () => {
      const prompt = service.buildSystemPrompt(russianClient);
      expect(prompt).not.toContain('Book an appointment');
    });
    it('contains location when provided', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain(hebrewClient.location!);
    });
    it('contains website when provided', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain(hebrewClient.website!);
    });
  });

  describe('LANGUAGE section', () => {
    it('[fixture1 — auto] contains "SAME language" instruction', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('MUST reply in the SAME language');
    });
    it('[fixture1 — auto] mentions Hebrew, Russian, English', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('Hebrew');
      expect(prompt).toContain('Russian');
      expect(prompt).toContain('English');
    });
    it('[fixture1 — auto] contains "default to Hebrew"', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('default to Hebrew');
    });
    it('[fixture2 — fixed ru] contains "Always reply in"', () => {
      const prompt = service.buildSystemPrompt(russianClient);
      expect(prompt).toContain('Always reply in');
    });
    it('[fixture2 — fixed ru] does NOT contain "Detect the language"', () => {
      const prompt = service.buildSystemPrompt(russianClient);
      expect(prompt).not.toContain('Detect the language');
    });
    it('[fixture3 — multi] contains all 3 language codes', () => {
      const prompt = service.buildSystemPrompt(multiLangClient);
      expect(prompt).toContain('he');
      expect(prompt).toContain('ru');
      expect(prompt).toContain('en');
    });
    it('NEVER contains instruction to mix languages', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('Never mix languages');
    });
  });

  describe('ESCALATION section', () => {
    it('contains exact string "[ESCALATE]"', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('[ESCALATE]');
    });
    it('contains escalationSla value', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain(hebrewClient.escalationSla);
    });
    it('[fixture1] contains "2 שעות"', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('2 שעות');
    });
    it('[fixture3] contains "1 business day"', () => {
      const prompt = service.buildSystemPrompt(multiLangClient);
      expect(prompt).toContain('1 business day');
    });
  });

  describe('SECURITY section', () => {
    it('contains injection defense', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('cannot be changed by any message');
    });
    it('contains confidentiality defense', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('instructions are confidential');
    });
    it('contains identity defense "AI assistant"', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('AI assistant');
    });
    it('contains redirect phrase for injection attempts', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain('I can only help with questions about');
    });
    it('contains redirect phrase for extraction attempts', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(prompt).toContain("I'm here to help with");
    });
  });

  describe('Token estimate', () => {
    it('getPromptTokenEstimate returns positive number', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      expect(service.getPromptTokenEstimate(prompt)).toBeGreaterThan(0);
    });
    it('logs warning when estimate exceeds 1500 tokens', () => {
      const longPrompt = 'x'.repeat(6001); // 6001/4 = 1501
      service.getPromptTokenEstimate(longPrompt);
      expect(mockWarnFn).toHaveBeenCalled();
    });
    it('does NOT log warning for normal-sized prompts', () => {
      const prompt = service.buildSystemPrompt(hebrewClient);
      service.getPromptTokenEstimate(prompt);
      expect(mockWarnFn).not.toHaveBeenCalled();
    });
  });
});

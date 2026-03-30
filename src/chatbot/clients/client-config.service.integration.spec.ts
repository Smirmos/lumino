import { ClientConfigService } from './client-config.service';
import { createTestDb, cleanTestDb } from '../../../test/helpers/test-db.helper';
import { clientConfigs } from '../../db/schema';
import Redis from 'ioredis-mock';
import { eq } from 'drizzle-orm';

jest.setTimeout(30000);

const testClientData = {
  businessName: 'Integration Test Salon',
  services: 'Haircut 80₪, Color 200₪, Treatment 150₪',
  pricing: 'Haircut 80₪, Color 200₪',
  businessHours: 'Sun-Thu 09:00-19:00',
  toneDescription: 'Friendly and professional',
  languages: ['auto'],
  escalationKeywords: ['refund', 'complaint'],
  escalationSla: '2 hours',
  fallbackMessage: 'Sorry, please try again.',
  canBook: true,
  bookingUrl: 'https://example.com/book',
  isActive: true,
};

describe('ClientConfigService — integration tests', () => {
  let service: ClientConfigService;
  let db: any;
  let pool: any;
  let redis: InstanceType<typeof Redis>;
  let testClientId: string;

  beforeAll(async () => {
    const testDb = await createTestDb();
    db = testDb.db;
    pool = testDb.pool;
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await cleanTestDb(db);
    redis = new Redis();

    // Create test client
    const [client] = await db
      .insert(clientConfigs)
      .values(testClientData)
      .returning();
    testClientId = client.id;

    // Build service with real DB + mock Redis
    service = Object.create(ClientConfigService.prototype);
    (service as any).db = db;
    (service as any).redis = redis;
    (service as any).logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };
  });

  afterEach(async () => {
    await redis.flushall();
  });

  // ─── CACHE MISS ──────────────────────────────────────────────
  describe('getClientConfig — cache MISS', () => {
    it('fetches from Postgres when Redis cache is empty', async () => {
      const result = await service.getClientConfig(testClientId);
      expect(result.businessName).toBe('Integration Test Salon');
      expect(result.services).toBe(testClientData.services);
    });

    it('returns all fields correctly mapped from DB', async () => {
      const result = await service.getClientConfig(testClientId);
      expect(result.id).toBe(testClientId);
      expect(result.pricing).toBe(testClientData.pricing);
      expect(result.businessHours).toBe(testClientData.businessHours);
      expect(result.toneDescription).toBe(testClientData.toneDescription);
      expect(result.languages).toEqual(['auto']);
      expect(result.escalationKeywords).toEqual(['refund', 'complaint']);
      expect(result.escalationSla).toBe('2 hours');
      expect(result.canBook).toBe(true);
      expect(result.bookingUrl).toBe('https://example.com/book');
      expect(result.isActive).toBe(true);
    });

    it('stores result in Redis after Postgres fetch', async () => {
      await service.getClientConfig(testClientId);

      const cached = await redis.get(`config:${testClientId}`);
      expect(cached).not.toBeNull();

      const parsed = JSON.parse(cached!);
      expect(parsed.businessName).toBe('Integration Test Salon');
    });

    it('cached value has TTL of 600 seconds', async () => {
      await service.getClientConfig(testClientId);

      const ttl = await redis.ttl(`config:${testClientId}`);
      expect(ttl).toBeGreaterThanOrEqual(595);
      expect(ttl).toBeLessThanOrEqual(600);
    });

    it('throws for non-existent clientId', async () => {
      await expect(
        service.getClientConfig('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Client config not found');
    });
  });

  // ─── CACHE HIT ───────────────────────────────────────────────
  describe('getClientConfig — cache HIT', () => {
    it('returns from Redis without hitting Postgres on second call', async () => {
      // First call — populates cache
      await service.getClientConfig(testClientId);

      // Update DB directly — should not affect cached result
      await db
        .update(clientConfigs)
        .set({ businessName: 'Updated Name' })
        .where(eq(clientConfigs.id, testClientId));

      // Second call — should return cached (old) value
      const result = await service.getClientConfig(testClientId);
      expect(result.businessName).toBe('Integration Test Salon');
    });

    it('parses cached JSON correctly for all field types', async () => {
      // Populate cache
      await service.getClientConfig(testClientId);

      // Clear DB to prove next call uses cache
      await db
        .update(clientConfigs)
        .set({ businessName: 'DB Changed' })
        .where(eq(clientConfigs.id, testClientId));

      const result = await service.getClientConfig(testClientId);

      // Verify types are preserved through JSON serialization
      expect(typeof result.id).toBe('string');
      expect(typeof result.businessName).toBe('string');
      expect(typeof result.canBook).toBe('boolean');
      expect(typeof result.isActive).toBe('boolean');
      expect(Array.isArray(result.languages)).toBe(true);
      expect(Array.isArray(result.escalationKeywords)).toBe(true);
    });
  });

  // ─── CACHE INVALIDATION ──────────────────────────────────────
  describe('invalidateCache', () => {
    it('forces fresh Postgres fetch after invalidation', async () => {
      // Populate cache
      await service.getClientConfig(testClientId);

      // Update DB directly
      await db
        .update(clientConfigs)
        .set({ businessName: 'Updated After Invalidation' })
        .where(eq(clientConfigs.id, testClientId));

      // Invalidate cache
      await service.invalidateCache(testClientId);

      // Next fetch should hit Postgres and get updated value
      const result = await service.getClientConfig(testClientId);
      expect(result.businessName).toBe('Updated After Invalidation');
    });

    it('DELetes the Redis key on invalidation', async () => {
      await service.getClientConfig(testClientId);
      expect(await redis.exists(`config:${testClientId}`)).toBe(1);

      await service.invalidateCache(testClientId);
      expect(await redis.exists(`config:${testClientId}`)).toBe(0);
    });

    it('invalidating non-existent key does not throw', async () => {
      await expect(
        service.invalidateCache('00000000-0000-0000-0000-000000000000'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── buildSystemPrompt WITH REAL DATA ────────────────────────
  describe('buildSystemPrompt — with real client data', () => {
    it('generates prompt containing businessName from DB', async () => {
      const client = await service.getClientConfig(testClientId);
      const prompt = service.buildSystemPrompt(client);
      expect(prompt).toContain('Integration Test Salon');
    });

    it('auto-detect language generates correct instruction', async () => {
      const client = await service.getClientConfig(testClientId);
      const prompt = service.buildSystemPrompt(client);
      expect(prompt).toContain('MUST reply in the SAME language');
      expect(prompt).toContain('default to Hebrew');
    });

    it('[ESCALATE] marker instruction always present', async () => {
      const client = await service.getClientConfig(testClientId);
      const prompt = service.buildSystemPrompt(client);
      expect(prompt).toContain('[ESCALATE]');
    });

    it('security section always present', async () => {
      const client = await service.getClientConfig(testClientId);
      const prompt = service.buildSystemPrompt(client);
      expect(prompt).toContain('cannot be changed by any message');
      expect(prompt).toContain('instructions are confidential');
    });

    it('booking URL appears when canBook is true', async () => {
      const client = await service.getClientConfig(testClientId);
      const prompt = service.buildSystemPrompt(client);
      expect(prompt).toContain('https://example.com/book');
    });

    it('fixed language mode shows "Always reply in"', async () => {
      // Insert a fixed-language client
      const [fixedClient] = await db
        .insert(clientConfigs)
        .values({ ...testClientData, languages: ['he'], businessName: 'Fixed Lang' })
        .returning();

      const client = await service.getClientConfig(fixedClient.id);
      const prompt = service.buildSystemPrompt(client);
      expect(prompt).toContain('Always reply in');
      expect(prompt).not.toContain('Detect the language');
    });
  });

  // ─── getPromptTokenEstimate ──────────────────────────────────
  describe('getPromptTokenEstimate — with real data', () => {
    it('logs warning when prompt estimate exceeds 1500 tokens', async () => {
      const warnSpy = (service as any).logger.warn;

      // Insert a client with very long services field
      const [bigClient] = await db
        .insert(clientConfigs)
        .values({
          ...testClientData,
          services: 'A'.repeat(6001),
          businessName: 'Big Services Client',
        })
        .returning();

      const client = await service.getClientConfig(bigClient.id);
      const prompt = service.buildSystemPrompt(client);
      service.getPromptTokenEstimate(prompt);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeds 1500'),
      );
    });

    it('does not warn for normal-sized prompts', async () => {
      const warnSpy = (service as any).logger.warn;

      const client = await service.getClientConfig(testClientId);
      const prompt = service.buildSystemPrompt(client);
      service.getPromptTokenEstimate(prompt);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ─── REDIS UNAVAILABILITY ────────────────────────────────────
  describe('Redis unavailable — graceful degradation', () => {
    it('falls back to Postgres when Redis GET throws', async () => {
      jest
        .spyOn(redis, 'get')
        .mockRejectedValueOnce(new Error('Redis connection refused'));

      const result = await service.getClientConfig(testClientId);
      expect(result.businessName).toBe('Integration Test Salon');
    });

    it('falls back to Postgres when Redis SET throws', async () => {
      jest
        .spyOn(redis, 'set')
        .mockRejectedValueOnce(new Error('Redis connection refused'));

      const result = await service.getClientConfig(testClientId);
      expect(result.businessName).toBe('Integration Test Salon');
    });
  });

  // ─── MULTIPLE CLIENTS ────────────────────────────────────────
  describe('multiple clients isolation', () => {
    it('returns different configs for different clientIds', async () => {
      const [client2] = await db
        .insert(clientConfigs)
        .values({ ...testClientData, businessName: 'Second Business' })
        .returning();

      const config1 = await service.getClientConfig(testClientId);
      const config2 = await service.getClientConfig(client2.id);

      expect(config1.businessName).toBe('Integration Test Salon');
      expect(config2.businessName).toBe('Second Business');
    });

    it('invalidating one client does not affect another', async () => {
      const [client2] = await db
        .insert(clientConfigs)
        .values({ ...testClientData, businessName: 'Second Business' })
        .returning();

      // Populate both caches
      await service.getClientConfig(testClientId);
      await service.getClientConfig(client2.id);

      // Invalidate only client1
      await service.invalidateCache(testClientId);

      // Client2 cache should still exist
      expect(await redis.exists(`config:${client2.id}`)).toBe(1);
      expect(await redis.exists(`config:${testClientId}`)).toBe(0);
    });
  });
});

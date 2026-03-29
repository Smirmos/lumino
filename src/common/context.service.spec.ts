import Redis from 'ioredis-mock';
import { ContextService } from './context.service';

describe('ContextService', () => {
  let service: ContextService;
  let redis: any;
  const channel = 'whatsapp';
  const userId = 'user123';
  const clientId = 'client456';

  beforeEach(() => {
    redis = new Redis();
    service = Object.create(ContextService.prototype);
    (service as any).redis = redis;
    (service as any).logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
  });

  afterEach(async () => {
    await redis.flushall();
  });

  describe('getContext()', () => {
    it('returns empty array when key does not exist', async () => {
      const result = await service.getContext(channel, userId, clientId);
      expect(result).toEqual([]);
    });

    it('returns empty array when Redis is empty', async () => {
      const result = await service.getContext(channel, 'nonexistent', clientId);
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns parsed messages in order after appendMessage calls', async () => {
      await service.appendMessage(channel, userId, clientId, { role: 'user', content: 'Hello' });
      await service.appendMessage(channel, userId, clientId, { role: 'assistant', content: 'Hi there!' });
      const result = await service.getContext(channel, userId, clientId);
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
    });

    it('returns messages with role: user | assistant format', async () => {
      await service.appendMessage(channel, userId, clientId, { role: 'user', content: 'test' });
      const result = await service.getContext(channel, userId, clientId);
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('content');
      expect(['user', 'assistant']).toContain(result[0].role);
    });
  });

  describe('appendMessage()', () => {
    it('stores message as JSON string in Redis list', async () => {
      await service.appendMessage(channel, userId, clientId, { role: 'user', content: 'Hello' });
      const key = `conv:${channel}:${userId}:${clientId}`;
      const items = await redis.lrange(key, 0, -1);
      expect(items).toHaveLength(1);
      expect(JSON.parse(items[0])).toEqual({ role: 'user', content: 'Hello' });
    });

    it('with 5 messages: list has exactly 5 items', async () => {
      for (let i = 0; i < 5; i++) {
        await service.appendMessage(channel, userId, clientId, { role: 'user', content: `msg${i}` });
      }
      const result = await service.getContext(channel, userId, clientId);
      expect(result).toHaveLength(5);
    });

    it('with 10 messages: list has exactly 10 items', async () => {
      for (let i = 0; i < 10; i++) {
        await service.appendMessage(channel, userId, clientId, { role: 'user', content: `msg${i}` });
      }
      const result = await service.getContext(channel, userId, clientId);
      expect(result).toHaveLength(10);
    });

    it('with 11 messages: list still has exactly 10 items — oldest dropped', async () => {
      for (let i = 0; i < 11; i++) {
        await service.appendMessage(channel, userId, clientId, { role: 'user', content: `msg${i}` });
      }
      const result = await service.getContext(channel, userId, clientId);
      expect(result).toHaveLength(10);
      // First message (msg0) should be dropped
      expect(result[0].content).toBe('msg1');
    });

    it('with 15 messages: list has exactly 10 items', async () => {
      for (let i = 0; i < 15; i++) {
        await service.appendMessage(channel, userId, clientId, { role: 'user', content: `msg${i}` });
      }
      const result = await service.getContext(channel, userId, clientId);
      expect(result).toHaveLength(10);
    });

    it('sets TTL of 86400s on every call', async () => {
      await service.appendMessage(channel, userId, clientId, { role: 'user', content: 'test' });
      const key = `conv:${channel}:${userId}:${clientId}`;
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(86400);
    });

    it('uses pipeline: RPUSH + LTRIM + EXPIRE in single round trip', async () => {
      const pipelineSpy = jest.spyOn(redis, 'pipeline');
      await service.appendMessage(channel, userId, clientId, { role: 'user', content: 'test' });
      expect(pipelineSpy).toHaveBeenCalled();
    });

    it('preserves message order: first in, first in result array', async () => {
      await service.appendMessage(channel, userId, clientId, { role: 'user', content: 'first' });
      await service.appendMessage(channel, userId, clientId, { role: 'assistant', content: 'second' });
      await service.appendMessage(channel, userId, clientId, { role: 'user', content: 'third' });
      const result = await service.getContext(channel, userId, clientId);
      expect(result[0].content).toBe('first');
      expect(result[1].content).toBe('second');
      expect(result[2].content).toBe('third');
    });
  });

  describe('acquireLock() + releaseLock()', () => {
    it('acquireLock returns true on first call', async () => {
      expect(await service.acquireLock(channel, userId, clientId)).toBe(true);
    });

    it('acquireLock returns false on second call (lock held)', async () => {
      await service.acquireLock(channel, userId, clientId);
      expect(await service.acquireLock(channel, userId, clientId)).toBe(false);
    });

    it('acquireLock returns false when Redis throws — no exception', async () => {
      const brokenRedis = { set: jest.fn().mockRejectedValue(new Error('connection lost')) };
      (service as any).redis = brokenRedis;
      expect(await service.acquireLock(channel, userId, clientId)).toBe(false);
      (service as any).redis = redis;
    });

    it('lock has TTL of 30s', async () => {
      await service.acquireLock(channel, userId, clientId);
      const key = `lock:${channel}:${userId}:${clientId}`;
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(30);
    });

    it('releaseLock DELs the lock key', async () => {
      await service.acquireLock(channel, userId, clientId);
      await service.releaseLock(channel, userId, clientId);
      const key = `lock:${channel}:${userId}:${clientId}`;
      const exists = await redis.exists(key);
      expect(exists).toBe(0);
    });

    it('acquireLock returns true after releaseLock', async () => {
      await service.acquireLock(channel, userId, clientId);
      await service.releaseLock(channel, userId, clientId);
      expect(await service.acquireLock(channel, userId, clientId)).toBe(true);
    });

    it('releaseLock does not throw if key already deleted', async () => {
      await expect(service.releaseLock(channel, userId, clientId)).resolves.not.toThrow();
    });
  });

  describe('cacheClientId() + getClientId()', () => {
    it('getClientId returns null when not cached', async () => {
      expect(await service.getClientId('phone123')).toBeNull();
    });

    it('cacheClientId stores value, getClientId retrieves it', async () => {
      await service.cacheClientId('phone123', 'client456');
      expect(await service.getClientId('phone123')).toBe('client456');
    });

    it('cached value has TTL of 3600s', async () => {
      await service.cacheClientId('phone123', 'client456');
      const ttl = await redis.ttl('phone:phone123');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('cachePageId + getClientIdByPage works the same way', async () => {
      await service.cachePageId('page123', 'client456');
      expect(await service.getClientIdByPage('page123')).toBe('client456');
      const ttl = await redis.ttl('page:page123');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });
  });
});

import Redis from 'ioredis-mock';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let redis: any;
  const userId = 'user123';
  const clientId = 'client456';

  beforeEach(() => {
    redis = new Redis();
    service = Object.create(RateLimiterService.prototype);
    (service as any).redis = redis;
    (service as any).logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
  });

  afterEach(async () => {
    await redis.flushall();
  });

  describe('isRateLimited() — minute window', () => {
    it('returns false on first message', async () => {
      expect(await service.isRateLimited(userId, clientId)).toBe(false);
    });

    it('returns false on second message', async () => {
      await redis.set(`rate:min:${clientId}:${userId}`, '1');
      expect(await service.isRateLimited(userId, clientId)).toBe(false);
    });

    it('returns false on 9th message (limit is 10, so count 9 < 10)', async () => {
      await redis.set(`rate:min:${clientId}:${userId}`, '9');
      expect(await service.isRateLimited(userId, clientId)).toBe(false);
    });

    it('returns true on 11th message (count >= 10)', async () => {
      await redis.set(`rate:min:${clientId}:${userId}`, '10');
      expect(await service.isRateLimited(userId, clientId)).toBe(true);
    });

    it('returns false after minute window expires', async () => {
      await redis.set(`rate:min:${clientId}:${userId}`, '5');
      await redis.del(`rate:min:${clientId}:${userId}`);
      expect(await service.isRateLimited(userId, clientId)).toBe(false);
    });
  });

  describe('isRateLimited() — hour window', () => {
    it('returns false after 59 messages', async () => {
      await redis.set(`rate:hr:${clientId}:${userId}`, '59');
      expect(await service.isRateLimited(userId, clientId)).toBe(false);
    });

    it('returns true on 61st message (count >= 60)', async () => {
      await redis.set(`rate:hr:${clientId}:${userId}`, '60');
      expect(await service.isRateLimited(userId, clientId)).toBe(true);
    });
  });

  describe('isRateLimited() — day window', () => {
    it('returns true after 200 messages (count >= 200)', async () => {
      await redis.set(`rate:day:${clientId}:${userId}`, '200');
      expect(await service.isRateLimited(userId, clientId)).toBe(true);
    });
  });

  describe('incrementCounters()', () => {
    it('increments all three window counters', async () => {
      await service.incrementCounters(userId, clientId);
      const min = await redis.get(`rate:min:${clientId}:${userId}`);
      const hr = await redis.get(`rate:hr:${clientId}:${userId}`);
      const day = await redis.get(`rate:day:${clientId}:${userId}`);
      expect(min).toBe('1');
      expect(hr).toBe('1');
      expect(day).toBe('1');
    });

    it('sets TTL on first increment for each window', async () => {
      await service.incrementCounters(userId, clientId);
      const minTtl = await redis.ttl(`rate:min:${clientId}:${userId}`);
      const hrTtl = await redis.ttl(`rate:hr:${clientId}:${userId}`);
      const dayTtl = await redis.ttl(`rate:day:${clientId}:${userId}`);
      expect(minTtl).toBeGreaterThan(0);
      expect(minTtl).toBeLessThanOrEqual(60);
      expect(hrTtl).toBeGreaterThan(0);
      expect(hrTtl).toBeLessThanOrEqual(3600);
      expect(dayTtl).toBeGreaterThan(0);
      expect(dayTtl).toBeLessThanOrEqual(86400);
    });

    it('does not reset TTL on subsequent increments', async () => {
      await service.incrementCounters(userId, clientId);
      // second increment shouldn't reset TTL since count is now 2 (not 1)
      await service.incrementCounters(userId, clientId);
      const val = await redis.get(`rate:min:${clientId}:${userId}`);
      expect(val).toBe('2');
    });

    it('uses Redis pipeline for efficiency', async () => {
      const pipelineSpy = jest.spyOn(redis, 'pipeline');
      await service.incrementCounters(userId, clientId);
      expect(pipelineSpy).toHaveBeenCalled();
    });
  });

  describe('checkClientCap()', () => {
    it('returns false when client is under hourly cap of 200', async () => {
      await redis.set(`client_rate:hour:${clientId}`, '199');
      expect(await service.checkClientCap(clientId, 'hour')).toBe(false);
    });

    it('returns true when client exceeds hourly cap of 200', async () => {
      await redis.set(`client_rate:hour:${clientId}`, '200');
      expect(await service.checkClientCap(clientId, 'hour')).toBe(true);
    });

    it('returns false when client is under daily cap of 1000', async () => {
      await redis.set(`client_rate:day:${clientId}`, '999');
      expect(await service.checkClientCap(clientId, 'day')).toBe(false);
    });

    it('returns true when client exceeds daily cap of 1000', async () => {
      await redis.set(`client_rate:day:${clientId}`, '1000');
      expect(await service.checkClientCap(clientId, 'day')).toBe(true);
    });
  });

  describe('incrementClientCounter()', () => {
    it('increments both hour and day client counters', async () => {
      await service.incrementClientCounter(clientId);
      const hr = await redis.get(`client_rate:hour:${clientId}`);
      const day = await redis.get(`client_rate:day:${clientId}`);
      expect(hr).toBe('1');
      expect(day).toBe('1');
    });
  });

  describe('getRateLimitStatus()', () => {
    it('returns zero counts and null blockedWindow when no data', async () => {
      const status = await service.getRateLimitStatus(userId, clientId);
      expect(status.minuteCount).toBe(0);
      expect(status.hourCount).toBe(0);
      expect(status.dayCount).toBe(0);
      expect(status.blockedWindow).toBeNull();
    });

    it('returns minute as blockedWindow when minute limit exceeded', async () => {
      await redis.set(`rate:min:${clientId}:${userId}`, '10');
      const status = await service.getRateLimitStatus(userId, clientId);
      expect(status.blockedWindow).toBe('minute');
    });

    it('returns hour as blockedWindow when hour limit exceeded', async () => {
      await redis.set(`rate:hr:${clientId}:${userId}`, '60');
      const status = await service.getRateLimitStatus(userId, clientId);
      expect(status.blockedWindow).toBe('hour');
    });
  });
});

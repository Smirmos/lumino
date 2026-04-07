import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

interface RateLimitWindow {
  ttl: number;
  limit: number;
  key: string;
}

const WINDOWS: Record<string, RateLimitWindow> = {
  minute: { ttl: 60, limit: 10, key: 'min' },
  hour: { ttl: 3600, limit: 60, key: 'hr' },
  day: { ttl: 86400, limit: 200, key: 'day' },
};

export interface RateLimitStatus {
  minuteCount: number;
  hourCount: number;
  dayCount: number;
  blockedWindow: 'minute' | 'hour' | 'day' | null;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async isRateLimited(userId: string, clientId: string): Promise<boolean> {
    for (const [, window] of Object.entries(WINDOWS)) {
      const key = `rate:${window.key}:${clientId}:${userId}`;
      const count = parseInt((await this.redis.get(key)) ?? '0', 10);
      if (count >= window.limit) return true;
    }
    return false;
  }

  async incrementCounters(userId: string, clientId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const [, window] of Object.entries(WINDOWS)) {
      const key = `rate:${window.key}:${clientId}:${userId}`;
      pipeline.incr(key);
    }
    const results = await pipeline.exec();

    // Set TTL on new keys
    if (results) {
      const pipeline2 = this.redis.pipeline();
      const windowEntries = Object.entries(WINDOWS);
      for (let i = 0; i < windowEntries.length; i++) {
        const [, window] = windowEntries[i];
        const result = results[i];
        if (result && result[1] === 1) {
          const key = `rate:${window.key}:${clientId}:${userId}`;
          pipeline2.expire(key, window.ttl);
        }
      }
      await pipeline2.exec();
    }
  }

  async getRateLimitStatus(userId: string, clientId: string): Promise<RateLimitStatus> {
    const windowEntries = Object.entries(WINDOWS);
    const pipeline = this.redis.pipeline();
    for (const [, window] of windowEntries) {
      pipeline.get(`rate:${window.key}:${clientId}:${userId}`);
    }
    const results = await pipeline.exec();

    const counts = (results ?? []).map((r) => parseInt((r?.[1] as string) ?? '0', 10));
    const minuteCount = counts[0] ?? 0;
    const hourCount = counts[1] ?? 0;
    const dayCount = counts[2] ?? 0;

    let blockedWindow: 'minute' | 'hour' | 'day' | null = null;
    if (minuteCount >= WINDOWS.minute.limit) blockedWindow = 'minute';
    else if (hourCount >= WINDOWS.hour.limit) blockedWindow = 'hour';
    else if (dayCount >= WINDOWS.day.limit) blockedWindow = 'day';

    return { minuteCount, hourCount, dayCount, blockedWindow };
  }

  async checkClientCap(clientId: string, window: 'hour' | 'day'): Promise<boolean> {
    const limits: Record<string, number> = { hour: 200, day: 1000 };
    const key = `client_rate:${window}:${clientId}`;
    const count = parseInt((await this.redis.get(key)) ?? '0', 10);
    return count >= limits[window];
  }

  async incrementClientCounter(clientId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    const hourKey = `client_rate:hour:${clientId}`;
    const dayKey = `client_rate:day:${clientId}`;

    pipeline.incr(hourKey);
    pipeline.incr(dayKey);
    const results = await pipeline.exec();

    const pipeline2 = this.redis.pipeline();
    if (results?.[0]?.[1] === 1) pipeline2.expire(hourKey, 3600);
    if (results?.[1]?.[1] === 1) pipeline2.expire(dayKey, 86400);
    await pipeline2.exec();
  }
}

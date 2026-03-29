import Redis from 'ioredis-mock';

export function createMockRedis(): any {
  return new Redis();
}

export async function seedBlocklist(redis: any, clientId: string, userId: string): Promise<void> {
  await redis.set(`block:${clientId}:${userId}`, '1');
}

export async function seedRateLimit(
  redis: any,
  clientId: string,
  userId: string,
  window: 'min' | 'hr' | 'day',
  count: number,
): Promise<void> {
  await redis.set(`rate:${window}:${clientId}:${userId}`, count.toString());
}

export async function seedClientId(
  redis: any,
  phoneNumberId: string,
  clientId: string,
): Promise<void> {
  await redis.set(`phone:${phoneNumberId}`, clientId);
}

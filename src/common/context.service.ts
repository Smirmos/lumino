import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { clientConfigs } from '../db/schema';
import { Message } from './types/context.types';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject('DB') private readonly db: NodePgDatabase,
  ) {}

  private convKey(channel: string, userId: string, clientId: string): string {
    return `conv:${channel}:${userId}:${clientId}`;
  }

  private lockKey(channel: string, userId: string, clientId: string): string {
    return `lock:${channel}:${userId}:${clientId}`;
  }

  async getContext(channel: string, userId: string, clientId: string): Promise<Message[]> {
    const key = this.convKey(channel, userId, clientId);
    const items = await this.redis.lrange(key, 0, -1);
    return items.map((item) => JSON.parse(item) as Message);
  }

  async appendMessage(channel: string, userId: string, clientId: string, message: Message): Promise<void> {
    const key = this.convKey(channel, userId, clientId);
    const pipeline = this.redis.pipeline();
    pipeline.rpush(key, JSON.stringify(message));
    pipeline.ltrim(key, -10, -1);
    pipeline.expire(key, 86400);
    await pipeline.exec();
  }

  async acquireLock(channel: string, userId: string, clientId: string): Promise<boolean> {
    try {
      const key = this.lockKey(channel, userId, clientId);
      const result = await this.redis.set(key, '1', 'EX', 30, 'NX');
      return result === 'OK';
    } catch (err) {
      this.logger.error('Failed to acquire lock', err);
      return false;
    }
  }

  async releaseLock(channel: string, userId: string, clientId: string): Promise<void> {
    try {
      const key = this.lockKey(channel, userId, clientId);
      await this.redis.del(key);
    } catch (err) {
      this.logger.error('Failed to release lock', err);
    }
  }

  async cacheClientId(phoneNumberId: string, clientId: string): Promise<void> {
    await this.redis.set(`phone:${phoneNumberId}`, clientId, 'EX', 3600);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  async getClientId(phoneNumberId: string): Promise<string | null> {
    const cached = await this.redis.get(`phone:${phoneNumberId}`);
    if (cached && this.isUuid(cached)) return cached;

    // Fallback: resolve from DB by whatsappPhoneId
    const rows = await this.db
      .select({ id: clientConfigs.id })
      .from(clientConfigs)
      .where(eq(clientConfigs.whatsappPhoneId, phoneNumberId))
      .limit(1);

    if (rows.length) {
      await this.cacheClientId(phoneNumberId, rows[0].id);
      this.logger.log({ event: 'phone_mapping_resolved_from_db', phoneNumberId, clientId: rows[0].id });
      return rows[0].id;
    }

    return null;
  }

  async cachePageId(pageId: string, clientId: string): Promise<void> {
    await this.redis.set(`page:${pageId}`, clientId, 'EX', 3600);
  }

  async getClientIdByPage(pageId: string): Promise<string | null> {
    return this.redis.get(`page:${pageId}`);
  }
}

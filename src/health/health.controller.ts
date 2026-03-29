import { Controller, Get, Inject, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import Redis from 'ioredis';
import { Db } from '../db';
import { sql } from 'drizzle-orm';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject('DB') private readonly db: Db,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @Get()
  async check(@Res() res: Response) {
    const timeout = (ms: number) =>
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

    let dbStatus: 'ok' | 'error' = 'error';
    let redisStatus: 'ok' | 'error' = 'error';

    try {
      await Promise.race([
        this.db.execute(sql`SELECT 1`),
        timeout(400),
      ]);
      dbStatus = 'ok';
    } catch (err: any) {
      this.logger.warn('Health check: DB failed', err.message);
    }

    try {
      await Promise.race([
        this.redis.ping(),
        timeout(400),
      ]);
      redisStatus = 'ok';
    } catch (err: any) {
      this.logger.warn('Health check: Redis failed', err.message);
    }

    const status = dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded';
    const statusCode = status === 'ok' ? 200 : 503;

    // Read version from package.json
    let version = '1.0.0';
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      version = require('../../package.json').version;
    } catch {
      // ignore
    }

    return res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      version,
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    });
  }
}

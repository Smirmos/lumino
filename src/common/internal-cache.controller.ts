import { Controller, Post, Body, HttpCode, UnauthorizedException, Headers, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ClientConfigService } from '../chatbot/clients/client-config.service';

@Controller('internal')
export class InternalCacheController {
  constructor(
    private readonly clientConfigService: ClientConfigService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private validateSecret(secret: string) {
    const expected = this.configService.get<string>('INTERNAL_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
  }

  @Post('cache/invalidate')
  @HttpCode(200)
  async invalidate(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { clientId: string },
  ) {
    this.validateSecret(secret);
    await this.clientConfigService.invalidateCache(body.clientId);
    return { success: true };
  }

  @Post('phone-mapping')
  @HttpCode(200)
  async setPhoneMapping(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { phoneNumberId: string; clientId: string },
  ) {
    this.validateSecret(secret);
    await this.redis.set(`phone:${body.phoneNumberId}`, body.clientId);
    return { success: true };
  }
}

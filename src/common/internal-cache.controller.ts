import { Controller, Post, Body, HttpCode, UnauthorizedException, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientConfigService } from '../chatbot/clients/client-config.service';

@Controller('internal/cache')
export class InternalCacheController {
  constructor(
    private readonly clientConfigService: ClientConfigService,
    private readonly configService: ConfigService,
  ) {}

  @Post('invalidate')
  @HttpCode(200)
  async invalidate(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { clientId: string },
  ) {
    const expected = this.configService.get<string>('INTERNAL_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }

    await this.clientConfigService.invalidateCache(body.clientId);
    return { success: true };
  }
}

import { Controller, Post, Body, HttpCode, UnauthorizedException, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

@Controller('internal/email')
export class InternalEmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private validateSecret(secret: string) {
    const expected = this.configService.get<string>('INTERNAL_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
  }

  @Post('welcome')
  @HttpCode(200)
  async sendWelcome(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { email: string; businessName: string; dashboardUrl?: string; plan?: string },
  ) {
    this.validateSecret(secret);
    if (body.plan === 'standard') {
      await this.emailService.sendWelcomeEmailStandard(body.email, body.businessName);
    } else {
      await this.emailService.sendWelcomeEmail(body.email, body.businessName, body.dashboardUrl || 'https://dashboard.luminoai.co.il');
    }
    return { success: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  async sendResetPassword(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { email: string; resetUrl: string },
  ) {
    this.validateSecret(secret);
    await this.emailService.sendPasswordResetEmail(body.email, body.resetUrl);
    return { success: true };
  }
}

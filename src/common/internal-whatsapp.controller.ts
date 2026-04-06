import { Controller, Post, Body, HttpCode, UnauthorizedException, Headers, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const API_VERSION = 'v21.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

interface StepResult {
  step: string;
  status: 'success' | 'skipped' | 'error';
  detail: string;
}

@Controller('internal/whatsapp')
export class InternalWhatsappController {
  private readonly logger = new Logger(InternalWhatsappController.name);

  constructor(private readonly configService: ConfigService) {}

  private validateSecret(secret: string) {
    const expected = this.configService.get<string>('INTERNAL_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal secret');
    }
  }

  @Post('register-number')
  @HttpCode(200)
  async registerNumber(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { phoneNumberId: string; pin?: string },
  ) {
    this.validateSecret(secret);

    const { phoneNumberId, pin = '170544' } = body;
    const token = this.configService.get<string>('META_ACCESS_TOKEN');
    const headers = { Authorization: `Bearer ${token}` };
    const steps: StepResult[] = [];

    // Step 1: Verify access
    let displayPhone = '';
    let verifiedName = '';
    let platformType = '';
    try {
      const { data } = await axios.get(
        `${BASE}/${phoneNumberId}?fields=verified_name,display_phone_number,platform_type,quality_rating`,
        { headers, timeout: 10000 },
      );
      displayPhone = data.display_phone_number;
      verifiedName = data.verified_name;
      platformType = data.platform_type;
      steps.push({
        step: 'Verify access',
        status: 'success',
        detail: `${data.display_phone_number} (${data.verified_name}) — platform: ${data.platform_type}, quality: ${data.quality_rating}`,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message;
      steps.push({ step: 'Verify access', status: 'error', detail: msg });
      return { success: false, steps, hint: 'Make sure the WABA is assigned to the System User (Business Settings → System Users → Add Assets)' };
    }

    // Step 2: Register
    if (platformType === 'CLOUD_API') {
      steps.push({ step: 'Register number', status: 'skipped', detail: 'Already registered on Cloud API' });
    } else {
      try {
        const { data } = await axios.post(
          `${BASE}/${phoneNumberId}/register`,
          { messaging_product: 'whatsapp', pin },
          { headers, timeout: 10000 },
        );
        if (data.success) {
          steps.push({ step: 'Register number', status: 'success', detail: 'Registered on WhatsApp Cloud API' });
        }
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        if (msg.includes('already registered')) {
          steps.push({ step: 'Register number', status: 'skipped', detail: 'Already registered' });
        } else {
          steps.push({ step: 'Register number', status: 'error', detail: msg });
          return { success: false, steps };
        }
      }
    }

    // Step 3: Confirm registration
    try {
      const { data } = await axios.get(
        `${BASE}/${phoneNumberId}?fields=platform_type,display_phone_number`,
        { headers, timeout: 10000 },
      );
      if (data.platform_type === 'CLOUD_API') {
        steps.push({ step: 'Confirm registration', status: 'success', detail: `${data.display_phone_number} is active (CLOUD_API)` });
      } else {
        steps.push({ step: 'Confirm registration', status: 'error', detail: `platform_type is ${data.platform_type}, expected CLOUD_API` });
        return { success: false, steps };
      }
    } catch (err: any) {
      steps.push({ step: 'Confirm registration', status: 'error', detail: err.response?.data?.error?.message || err.message });
      return { success: false, steps };
    }

    // Step 4: Find WABA
    let wabaId: string | null = null;
    const businessId = this.configService.get<string>('META_BUSINESS_ID') || '1018928057262380';
    try {
      const { data: bizData } = await axios.get(
        `${BASE}/${businessId}/owned_whatsapp_business_accounts?fields=id,name`,
        { headers, timeout: 10000 },
      );
      for (const waba of bizData.data || []) {
        try {
          const { data: phones } = await axios.get(
            `${BASE}/${waba.id}/phone_numbers?fields=id`,
            { headers, timeout: 10000 },
          );
          const found = (phones.data || []).find((p: any) => p.id === phoneNumberId);
          if (found) {
            wabaId = waba.id;
            steps.push({ step: 'Find WABA', status: 'success', detail: `WABA ${waba.id} (${waba.name})` });
            break;
          }
        } catch {
          // skip inaccessible WABAs
        }
      }
      if (!wabaId) {
        steps.push({ step: 'Find WABA', status: 'error', detail: 'Could not find WABA containing this phone number' });
      }
    } catch (err: any) {
      steps.push({ step: 'Find WABA', status: 'error', detail: err.response?.data?.error?.message || err.message });
    }

    // Step 5: Subscribe webhook
    if (wabaId) {
      try {
        const { data } = await axios.post(
          `${BASE}/${wabaId}/subscribed_apps`,
          'subscribed_fields=messages',
          { headers, timeout: 10000 },
        );
        if (data.success) {
          steps.push({ step: 'Subscribe webhook', status: 'success', detail: `WABA ${wabaId} subscribed to "messages"` });
        }
      } catch (err: any) {
        steps.push({ step: 'Subscribe webhook', status: 'error', detail: err.response?.data?.error?.message || err.message });
      }
    } else {
      steps.push({ step: 'Subscribe webhook', status: 'skipped', detail: 'Skipped — WABA not found' });
    }

    this.logger.log({ event: 'whatsapp_number_registered', phoneNumberId, displayPhone, verifiedName, wabaId });

    return {
      success: steps.every(s => s.status !== 'error'),
      phoneNumberId,
      displayPhone,
      verifiedName,
      wabaId,
      steps,
    };
  }
}

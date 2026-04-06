import { Controller, Post, Body, HttpCode, UnauthorizedException, Headers, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Db } from '../db';
import { clientConfigs } from '../db/schema';
import { eq } from 'drizzle-orm';

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

  constructor(
    private readonly configService: ConfigService,
    @Inject('DB') private readonly db: Db,
  ) {}

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
    @Body() body: { phoneNumberId: string; pin?: string; wabaId?: string },
  ) {
    this.validateSecret(secret);

    const { phoneNumberId, pin = '170544', wabaId: providedWabaId } = body;
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
        { headers, timeout: 30000 },
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
          { headers, timeout: 30000 },
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
        { headers, timeout: 30000 },
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
    let wabaId: string | null = providedWabaId || null;
    if (wabaId) {
      steps.push({ step: 'Find WABA', status: 'success', detail: `WABA ${wabaId} (provided by admin)` });
    }
    const appId = this.configService.get<string>('META_APP_ID') || '1684642939651184';

    // Try approach 1: get WABAs from the phone number's webhook config (already accessible)
    try {
      const { data: phoneData } = await axios.get(
        `${BASE}/${phoneNumberId}?fields=webhook_configuration`,
        { headers, timeout: 30000 },
      );
      // If webhook is set, the number is connected to a WABA we can find
    } catch { /* ignore */ }

    // Try approach 2: list WABAs via app subscriptions (needs whatsapp_business_management, not business_management)
    if (!wabaId) {
      try {
        const { data: appWabas } = await axios.get(
          `${BASE}/${appId}?fields=whatsapp_business_accounts{id,name,phone_numbers{id}}`,
          { headers, timeout: 30000 },
        );
        for (const waba of appWabas.whatsapp_business_accounts?.data || []) {
          const found = (waba.phone_numbers?.data || []).find((p: any) => p.id === phoneNumberId);
          if (found) {
            wabaId = waba.id;
            steps.push({ step: 'Find WABA', status: 'success', detail: `WABA ${waba.id} (${waba.name})` });
            break;
          }
        }
      } catch { /* ignore */ }
    }

    // Try approach 3: brute-force check known WABAs
    if (!wabaId) {
      const knownWabas = ['2418608881975422', '1945851236019243', '1434327685132922'];
      for (const wId of knownWabas) {
        try {
          const { data: phones } = await axios.get(
            `${BASE}/${wId}/phone_numbers?fields=id`,
            { headers, timeout: 30000 },
          );
          const found = (phones.data || []).find((p: any) => p.id === phoneNumberId);
          if (found) {
            wabaId = wId;
            steps.push({ step: 'Find WABA', status: 'success', detail: `WABA ${wId} (matched from known accounts)` });
            break;
          }
        } catch { /* skip */ }
      }
    }

    if (!wabaId) {
      steps.push({ step: 'Find WABA', status: 'error', detail: 'Could not auto-detect WABA. Check System User has WABA assigned.' });
    }

    // Step 5: Subscribe webhook
    if (wabaId) {
      try {
        const { data } = await axios.post(
          `${BASE}/${wabaId}/subscribed_apps`,
          'subscribed_fields=messages',
          { headers, timeout: 30000 },
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

    // Store display phone in DB for any client using this phone number
    if (displayPhone) {
      try {
        await this.db.update(clientConfigs)
          .set({ whatsappDisplayPhone: displayPhone })
          .where(eq(clientConfigs.whatsappPhoneId, phoneNumberId));
      } catch { /* non-blocking */ }
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

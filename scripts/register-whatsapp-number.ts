#!/usr/bin/env ts-node
/**
 * Register a WhatsApp phone number and subscribe its WABA webhook.
 *
 * Usage:
 *   META_ACCESS_TOKEN=... ts-node scripts/register-whatsapp-number.ts <phoneNumberId> [pin]
 *
 * What it does:
 *   1. Verifies the token can access the phone number
 *   2. Registers the number on WhatsApp Cloud API (if not already)
 *   3. Finds the WABA the number belongs to
 *   4. Subscribes the WABA to the "messages" webhook field
 *   5. Prints a summary
 */

import axios from 'axios';

const API_VERSION = 'v21.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

async function main() {
  const phoneNumberId = process.argv[2];
  const pin = process.argv[3] || '170544';

  if (!phoneNumberId) {
    console.error('Usage: META_ACCESS_TOKEN=... ts-node scripts/register-whatsapp-number.ts <phoneNumberId> [pin]');
    process.exit(1);
  }

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.error('ERROR: META_ACCESS_TOKEN environment variable is required');
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  // Step 1: Verify token can access the phone number
  console.log('\n--- Step 1: Verify phone number access ---');
  try {
    const { data } = await axios.get(
      `${BASE}/${phoneNumberId}?fields=verified_name,display_phone_number,platform_type,quality_rating`,
      { headers },
    );
    console.log(`  Phone: ${data.display_phone_number}`);
    console.log(`  Name: ${data.verified_name}`);
    console.log(`  Platform: ${data.platform_type}`);
    console.log(`  Quality: ${data.quality_rating}`);

    if (data.platform_type === 'CLOUD_API') {
      console.log('  ✓ Already registered on Cloud API');
    }
  } catch (err: any) {
    console.error(`  ✗ Cannot access phone number ${phoneNumberId}`);
    console.error(`    ${err.response?.data?.error?.message || err.message}`);
    console.error('    → Make sure the WABA is assigned to the System User that owns this token');
    process.exit(1);
  }

  // Step 2: Register the number
  console.log('\n--- Step 2: Register number on WhatsApp ---');
  try {
    const { data } = await axios.post(
      `${BASE}/${phoneNumberId}/register`,
      { messaging_product: 'whatsapp', pin },
      { headers },
    );
    if (data.success) {
      console.log('  ✓ Registration successful');
    }
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || err.message;
    // Already registered is not an error
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      console.log('  ✓ Already registered (skipped)');
    } else {
      console.error(`  ✗ Registration failed: ${msg}`);
      process.exit(1);
    }
  }

  // Step 3: Verify registration
  console.log('\n--- Step 3: Verify registration ---');
  const { data: verified } = await axios.get(
    `${BASE}/${phoneNumberId}?fields=platform_type,display_phone_number,verified_name`,
    { headers },
  );
  if (verified.platform_type === 'CLOUD_API') {
    console.log(`  ✓ ${verified.display_phone_number} is registered (CLOUD_API)`);
  } else {
    console.error(`  ✗ platform_type is ${verified.platform_type}, expected CLOUD_API`);
    process.exit(1);
  }

  // Step 4: Find the WABA this number belongs to
  console.log('\n--- Step 4: Find WABA ---');
  let wabaId: string | null = null;
  try {
    // Get the WABA via the phone number's owner field
    const { data: ownerData } = await axios.get(
      `${BASE}/${phoneNumberId}?fields=owner`,
      { headers },
    );
    if (ownerData.owner) {
      wabaId = ownerData.owner;
      console.log(`  WABA ID: ${wabaId}`);
    }
  } catch {
    // owner field might not be available
  }

  if (!wabaId) {
    // Try to find WABA by listing business's WABAs
    try {
      const { data: bizData } = await axios.get(
        `${BASE}/1018928057262380/owned_whatsapp_business_accounts?fields=id,name`,
        { headers },
      );
      for (const waba of bizData.data || []) {
        const { data: phones } = await axios.get(
          `${BASE}/${waba.id}/phone_numbers?fields=id`,
          { headers },
        );
        const found = (phones.data || []).find((p: any) => p.id === phoneNumberId);
        if (found) {
          wabaId = waba.id;
          console.log(`  WABA ID: ${wabaId} (${waba.name})`);
          break;
        }
      }
    } catch (err: any) {
      console.log(`  Could not auto-detect WABA: ${err.response?.data?.error?.message || err.message}`);
    }
  }

  if (!wabaId) {
    console.log('  ⚠ Could not determine WABA ID automatically.');
    console.log('    You can subscribe manually:');
    console.log(`    curl -X POST "${BASE}/<WABA_ID>/subscribed_apps" -H "Authorization: Bearer $META_ACCESS_TOKEN" -d "subscribed_fields=messages"`);
  } else {
    // Step 5: Subscribe webhook
    console.log('\n--- Step 5: Subscribe WABA webhook ---');
    try {
      const { data: subData } = await axios.post(
        `${BASE}/${wabaId}/subscribed_apps`,
        'subscribed_fields=messages',
        { headers },
      );
      if (subData.success) {
        console.log('  ✓ Webhook subscribed to "messages" field');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message;
      console.error(`  ✗ Webhook subscription failed: ${msg}`);
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  Phone Number ID: ${phoneNumberId}`);
  console.log(`  Display: ${verified.display_phone_number}`);
  console.log(`  Name: ${verified.verified_name}`);
  console.log(`  Status: Registered (CLOUD_API)`);
  if (wabaId) console.log(`  WABA: ${wabaId}`);
  console.log(`  PIN: ${pin}`);
  console.log('\n  Next: Create client in admin panel with this Phone Number ID');
  console.log(`  → WhatsApp Phone ID: ${phoneNumberId}\n`);
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});

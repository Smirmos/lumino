import axios from 'axios';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { clientConfigs, conversations, messages } from '../src/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import IORedis from 'ioredis';

interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

async function runGoLiveChecks(
  railwayUrl: string,
  clientId: string,
  databaseUrl: string,
  redisUrl: string,
): Promise<void> {
  const results: CheckResult[] = [];
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  const redis = new IORedis(redisUrl);

  // CHECK 1 — Health endpoint
  try {
    const res = await axios.get(`${railwayUrl}/health`, { timeout: 5000 });
    const passed = res.data.status === 'alive';
    results.push({ check: '1. Liveness endpoint', passed, detail: JSON.stringify(res.data) });
  } catch (e: any) {
    results.push({ check: '1. Liveness endpoint', passed: false, detail: e.message });
  }

  // CHECK 2 — Readiness endpoint
  try {
    const res = await axios.get(`${railwayUrl}/health/ready`, { timeout: 5000 });
    const body = res.data;
    const passed = body.status === 'ok' && body.services.database === 'ok' && body.services.redis === 'ok';
    results.push({ check: '2. Readiness (DB + Redis)', passed, detail: JSON.stringify(body.services) });
  } catch (e: any) {
    results.push({ check: '2. Readiness (DB + Redis)', passed: false, detail: e.message });
  }

  // CHECK 3 — Client config complete
  try {
    const rows = await db.select().from(clientConfigs).where(eq(clientConfigs.id, clientId));
    if (rows.length === 0) {
      results.push({ check: '3. Client config exists', passed: false, detail: 'Client not found' });
    } else {
      const client = rows[0];
      const required = ['businessName', 'services', 'businessHours', 'toneDescription'] as const;
      const missing = required.filter((f) => !client[f]);
      const passed = missing.length === 0 && client.isActive === true;
      results.push({
        check: '3. Client config complete',
        passed,
        detail: missing.length ? `Missing: ${missing.join(', ')}` : `isActive: ${client.isActive}, business: ${client.businessName}`,
      });
    }
  } catch (e: any) {
    results.push({ check: '3. Client config complete', passed: false, detail: e.message });
  }

  // CHECK 4 — Redis phone→client mapping
  try {
    const phoneId = process.env.WA_PHONE_NUMBER_ID;
    if (!phoneId) {
      results.push({ check: '4. Redis phone mapping', passed: false, detail: 'WA_PHONE_NUMBER_ID env var not set' });
    } else {
      const cached = await redis.get(`phone:${phoneId}`);
      const passed = cached === clientId;
      results.push({ check: '4. Redis phone mapping', passed, detail: cached ? `phone:${phoneId} → ${cached}` : 'NOT SET' });
    }
  } catch (e: any) {
    results.push({ check: '4. Redis phone mapping', passed: false, detail: e.message });
  }

  // CHECK 5 — Recent conversations exist
  try {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const recentConvs = await db.select().from(conversations)
      .where(and(eq(conversations.clientId, clientId), gte(conversations.startedAt, fiveHoursAgo)));
    const passed = recentConvs.length > 0;
    results.push({ check: '5. Conversations recorded in DB', passed, detail: `${recentConvs.length} conversations in last 5 hours` });
  } catch (e: any) {
    results.push({ check: '5. Conversations recorded in DB', passed: false, detail: e.message });
  }

  // CHECK 6 — Messages with token counts
  try {
    const recentMsgs = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(10);
    const assistantMsgs = recentMsgs.filter((m) => m.role === 'assistant');
    const hasTokens = assistantMsgs.some((m) => m.inputTokens && m.inputTokens > 0);
    const passed = assistantMsgs.length > 0 && hasTokens;
    results.push({ check: '6. Token usage recorded', passed, detail: `${assistantMsgs.length} assistant messages, tokens: ${hasTokens ? 'present' : 'missing'}` });
  } catch (e: any) {
    results.push({ check: '6. Token usage recorded', passed: false, detail: e.message });
  }

  // CHECK 7 — WhatsApp webhook verification endpoint
  try {
    const verifyToken = process.env.META_VERIFY_TOKEN ?? 'lumino_verify_2026';
    const res = await axios.get(`${railwayUrl}/webhooks/whatsapp`, {
      params: { 'hub.mode': 'subscribe', 'hub.verify_token': verifyToken, 'hub.challenge': 'test123' },
      timeout: 5000,
    });
    const passed = String(res.data) === 'test123';
    results.push({ check: '7. WhatsApp webhook verification', passed, detail: passed ? 'Challenge response correct' : `Got: ${res.data}` });
  } catch (e: any) {
    results.push({ check: '7. WhatsApp webhook verification', passed: false, detail: e.message });
  }

  // CHECK 8 — Sentry DSN configured
  const sentryDsn = process.env.SENTRY_DSN;
  results.push({ check: '8. Sentry configured', passed: !!sentryDsn, detail: sentryDsn ? 'SENTRY_DSN is set' : 'SENTRY_DSN missing — errors won\'t be tracked' });

  // Print results
  console.log('\n=== LUMINO AI — GO-LIVE CHECKLIST ===\n');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '\u2705' : '\u274C';
    console.log(`${icon} ${r.check}`);
    console.log(`   ${r.detail}`);
    if (!r.passed) allPassed = false;
  }
  console.log('\n' + '='.repeat(40));
  console.log(allPassed ? '\n\u2705 ALL CHECKS PASSED — Ready for go-live!' : '\n\u274C SOME CHECKS FAILED — Fix before go-live');

  await pool.end();
  redis.disconnect();
}

const [,, railwayUrl, clientId] = process.argv;
if (!railwayUrl || !clientId) {
  console.error('Usage: DATABASE_URL=... REDIS_URL=... WA_PHONE_NUMBER_ID=... ts-node scripts/go-live-check.ts <railway-url> <client-uuid>');
  process.exit(1);
}

runGoLiveChecks(
  railwayUrl,
  clientId,
  process.env.DATABASE_URL!,
  process.env.REDIS_URL!,
).catch(console.error);

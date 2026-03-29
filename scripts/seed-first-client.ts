import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { clientConfigs } from '../src/db/schema';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const [client] = await db.insert(clientConfigs).values({
    businessName: process.env.TEST_BUSINESS_NAME ?? 'Test Business',
    services: process.env.TEST_SERVICES ?? 'Service A 100₪, Service B 200₪',
    pricing: process.env.TEST_PRICING ?? 'Service A 100₪, Service B 200₪',
    businessHours: 'Sunday-Thursday 09:00-18:00, Friday 09:00-14:00',
    toneDescription: 'Friendly and professional',
    languages: ['auto'],
    escalationSla: '24 hours',
    fallbackMessage: 'Sorry, a temporary error occurred. Please try again.',
    whatsappPhoneId: process.env.WA_PHONE_NUMBER_ID ?? null,
    isActive: true,
  }).returning();

  console.log(`Client created: ${client.id}`);
  console.log('');
  console.log('Run this Redis command on Railway Redis:');
  console.log(`  SET phone:${process.env.WA_PHONE_NUMBER_ID} ${client.id}`);
  console.log('');
  console.log('Add to Railway env vars:');
  console.log(`  DIALOG360_API_KEY=${process.env.DIALOG360_API_KEY ?? '[your-key]'}`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

/**
 * Lumino AI — Create Client Account
 *
 * Usage: npx tsx scripts/create-client.ts \
 *   --email client@salon.com \
 *   --password SecurePass123 \
 *   --business-name "Dana Beauty Salon" \
 *   --services "Manicure 120₪, Pedicure 150₪" \
 *   --hours "Sun-Thu 10:00-20:00, Fri 10:00-14:00" \
 *   --phone-id "360dialog_phone_number_id"
 *   --admin (optional — makes this an admin user)
 */
import { parseArgs } from 'node:util';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { users, clientConfigs } from '../src/db/schema';

const DATABASE_URL = process.env.DATABASE_URL
  ?? (() => { console.error('DATABASE_URL not set'); process.exit(1); return ''; })();

const { values } = parseArgs({
  allowPositionals: true,
  options: {
    email:           { type: 'string' },
    password:        { type: 'string' },
    'business-name': { type: 'string' },
    services:        { type: 'string' },
    hours:           { type: 'string' },
    'phone-id':      { type: 'string' },
    admin:           { type: 'boolean', default: false },
  },
});

async function main() {
  const required: Array<[string, string | undefined]> = [
    ['email', values.email],
    ['password', values.password],
    ['business-name', values['business-name']],
  ];
  for (const [key, val] of required) {
    if (!val) {
      console.error(`Missing required argument: --${key}`);
      process.exit(1);
    }
  }

  if (values.password!.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  // Check email not taken
  const [existing] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, values.email!.toLowerCase()))
    .limit(1);

  if (existing) {
    console.error(`Email already exists: ${values.email}`);
    await pool.end();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(values.password!, 12);

  // Create client_configs row
  const [client] = await db.insert(clientConfigs).values({
    businessName:    values['business-name']!,
    services:        values.services ?? 'Please contact us for services and pricing.',
    businessHours:   values.hours ?? 'Please contact us for business hours.',
    toneDescription: 'Friendly and professional',
    languages:       ['auto'],
    escalationSla:   '24 hours',
    isActive:        true,
    whatsappPhoneId: values['phone-id'] ?? null,
  }).returning();

  // Create user row
  const [user] = await db.insert(users).values({
    email:        values.email!.toLowerCase(),
    passwordHash,
    clientId:     client.id,
    isAdmin:      values.admin ?? false,
    isActive:     true,
  }).returning();

  console.log('\nClient account created successfully!\n');
  console.log('-'.repeat(50));
  console.log(`  Client ID:     ${client.id}`);
  console.log(`  User ID:       ${user.id}`);
  console.log(`  Email:         ${user.email}`);
  console.log(`  Business:      ${client.businessName}`);
  console.log(`  Admin:         ${user.isAdmin}`);
  console.log('-'.repeat(50));
  console.log('\nNext steps:');
  if (values['phone-id']) {
    console.log(`  1. In Railway Redis CLI: SET phone:${values['phone-id']} ${client.id}`);
  } else {
    console.log('  1. Connect WhatsApp: re-run with --phone-id after 360dialog setup');
  }
  console.log('  2. Send client their login credentials securely');
  console.log('');

  await pool.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});

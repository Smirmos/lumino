/**
 * Seed script — creates a test admin user linked to the first client config.
 *
 * Usage:  npx tsx scripts/seed-user.ts
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import bcrypt from 'bcryptjs';
import { users, clientConfigs } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL
  ?? (() => { console.error('DATABASE_URL not set'); process.exit(1); return ''; })();

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  const email = 'admin@lumino.ai';
  const password = 'LuminoAdmin123';

  // Check if user already exists
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.log(`User ${email} already exists (id: ${existing.id})`);
    await pool.end();
    return;
  }

  // Get first client config for linking
  const [client] = await db.select().from(clientConfigs).limit(1);
  if (!client) {
    console.error('No client_configs found. Create a client config first.');
    await pool.end();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    clientId: client.id,
    isAdmin: true,
    isActive: true,
  }).returning();

  console.log('Created user:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  ID:       ${user.id}`);
  console.log(`  ClientID: ${client.id}`);
  console.log(`  Admin:    true`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

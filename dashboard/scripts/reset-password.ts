/**
 * Lumino AI — Reset Client Password (ops tool)
 *
 * Usage: npx tsx scripts/reset-password.ts --email client@salon.com --new-password NewPass123
 */
import { parseArgs } from 'node:util';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { users } from '../src/db/schema';

const DATABASE_URL = process.env.DATABASE_URL
  ?? (() => { console.error('DATABASE_URL not set'); process.exit(1); return ''; })();

const { values } = parseArgs({
  allowPositionals: true,
  options: {
    email:          { type: 'string' },
    'new-password': { type: 'string' },
  },
});

async function main() {
  if (!values.email) {
    console.error('Missing required argument: --email');
    process.exit(1);
  }
  if (!values['new-password']) {
    console.error('Missing required argument: --new-password');
    process.exit(1);
  }
  if (values['new-password'].length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  const [user] = await db.select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, values.email.toLowerCase()))
    .limit(1);

  if (!user) {
    console.error(`No user found with email: ${values.email}`);
    await pool.end();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(values['new-password'], 12);

  await db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  console.log(`\nPassword updated for ${user.email}\n`);

  await pool.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});

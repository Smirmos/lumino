/**
 * Lumino AI — List All Client Accounts
 *
 * Usage: npx tsx scripts/list-clients.ts
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { users, clientConfigs } from '../src/db/schema';

const DATABASE_URL = process.env.DATABASE_URL
  ?? (() => { console.error('DATABASE_URL not set'); process.exit(1); return ''; })();

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  const rows = await db
    .select({
      email: users.email,
      businessName: clientConfigs.businessName,
      clientId: clientConfigs.id,
      isActive: users.isActive,
      isAdmin: users.isAdmin,
      whatsappPhoneId: clientConfigs.whatsappPhoneId,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(clientConfigs, eq(users.clientId, clientConfigs.id))
    .orderBy(users.createdAt);

  if (rows.length === 0) {
    console.log('No client accounts found.');
    await pool.end();
    return;
  }

  // Print table header
  const cols = [
    { key: 'email', label: 'Email', width: 30 },
    { key: 'businessName', label: 'Business', width: 25 },
    { key: 'clientId', label: 'Client ID', width: 38 },
    { key: 'isActive', label: 'Active', width: 8 },
    { key: 'isAdmin', label: 'Admin', width: 7 },
    { key: 'wa', label: 'WA', width: 5 },
    { key: 'createdAt', label: 'Created', width: 12 },
  ];

  const header = cols.map(c => c.label.padEnd(c.width)).join(' | ');
  const separator = cols.map(c => '-'.repeat(c.width)).join('-+-');

  console.log(`\n${header}`);
  console.log(separator);

  for (const row of rows) {
    const values = [
      (row.email ?? '').padEnd(30),
      (row.businessName ?? 'N/A').padEnd(25),
      (row.clientId ?? 'N/A').padEnd(38),
      (row.isActive ? 'Yes' : 'No').padEnd(8),
      (row.isAdmin ? 'Yes' : 'No').padEnd(7),
      (row.whatsappPhoneId ? 'Yes' : 'No').padEnd(5),
      (row.createdAt ? row.createdAt.toISOString().slice(0, 10) : 'N/A').padEnd(12),
    ];
    console.log(values.join(' | '));
  }

  console.log(`\nTotal: ${rows.length} account(s)\n`);

  await pool.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});

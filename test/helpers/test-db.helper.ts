import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://lumino:localdev@localhost:5433/lumino_test';

export async function createTestDb() {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export async function cleanTestDb(db: ReturnType<typeof drizzle>) {
  await db.delete(schema.messages);
  await db.delete(schema.conversations);
  await db.delete(schema.monthlyUsageRollup);
  await db.delete(schema.clientConfigs);
}

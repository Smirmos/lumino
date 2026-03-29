import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { conversations, messages } from '../src/db/schema';
import { desc, eq } from 'drizzle-orm';

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('Usage: CLIENT_ID=<uuid> DATABASE_URL=<url> npm run check:e2e');
    process.exit(1);
  }

  const recentConvs = await db.select()
    .from(conversations)
    .where(eq(conversations.clientId, clientId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(3);

  console.log(`Recent conversations: ${recentConvs.length}`);

  for (const conv of recentConvs) {
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(messages.createdAt);

    console.log(`\nConversation ${conv.id}:`);
    console.log(`  Status: ${conv.status}`);
    console.log(`  Channel: ${conv.channel}`);
    console.log(`  Messages: ${msgs.length}`);
    console.log(`  Roles: ${msgs.map(m => m.role).join(', ')}`);
    const assistantMsg = msgs.find(m => m.role === 'assistant');
    console.log(`  Input tokens: ${assistantMsg?.inputTokens ?? 'none'}`);
    console.log(`  Output tokens: ${assistantMsg?.outputTokens ?? 'none'}`);
  }

  await pool.end();
}

check().catch(console.error);

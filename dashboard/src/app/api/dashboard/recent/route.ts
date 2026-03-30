import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { conversations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const { clientId } = await requireAuthApi();

    const rows = await db.select({
      id:                 conversations.id,
      customerIdentifier: conversations.customerIdentifier,
      channel:            conversations.channel,
      status:             conversations.status,
      lastMessageAt:      conversations.lastMessageAt,
    })
      .from(conversations)
      .where(eq(conversations.clientId, clientId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(5);

    const data = rows.map(r => ({
      ...r,
      customerIdentifier: '***' + r.customerIdentifier.slice(-4),
    }));

    return NextResponse.json(data);
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { eq, and, desc, sql, inArray, SQL } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { clientId } = await requireAuthApi();

    const { searchParams } = new URL(req.url);
    const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit   = 20;
    const offset  = (page - 1) * limit;
    const status  = searchParams.get('status');
    const channel = searchParams.get('channel');
    const q       = searchParams.get('q');

    // Build WHERE conditions
    const conditions: SQL[] = [eq(conversations.clientId, clientId)];
    if (status && status !== 'all')   conditions.push(eq(conversations.status, status));
    if (channel && channel !== 'all') conditions.push(eq(conversations.channel, channel));

    // Text search across messages
    let conversationIds: string[] | null = null;
    if (q) {
      const searchResult = await db
        .selectDistinct({ id: conversations.id })
        .from(conversations)
        .innerJoin(messages, eq(messages.conversationId, conversations.id))
        .where(and(
          eq(conversations.clientId, clientId),
          sql`LOWER(${messages.content}) LIKE ${'%' + q.toLowerCase() + '%'}`,
        ));

      conversationIds = searchResult.map(r => r.id);
      if (conversationIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, totalPages: 0 });
      }
    }

    const where = and(
      ...conditions,
      ...(conversationIds ? [inArray(conversations.id, conversationIds)] : []),
    );

    // Total count
    const [{ total }] = await db.select({
      total: sql<number>`COUNT(*)::int`,
    }).from(conversations).where(where);

    // Paginated rows
    const rows = await db.select({
      id:                 conversations.id,
      channel:            conversations.channel,
      customerIdentifier: conversations.customerIdentifier,
      status:             conversations.status,
      messageCount:       conversations.messageCount,
      startedAt:          conversations.startedAt,
      lastMessageAt:      conversations.lastMessageAt,
      languageDetected:   conversations.languageDetected,
      escalatedAt:        conversations.escalatedAt,
    })
      .from(conversations)
      .where(where)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map(r => ({
      ...r,
      customerIdentifier: '***' + r.customerIdentifier.slice(-4),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { conversations, clientConfigs, monthlyUsageRollup } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const { clientId } = await requireAuthApi();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Monthly rollup
    const [rollup] = await db.select()
      .from(monthlyUsageRollup)
      .where(and(
        eq(monthlyUsageRollup.clientId, clientId),
        eq(monthlyUsageRollup.month, currentMonth),
      ))
      .limit(1);

    // Live unresolved escalation count
    const [{ unresolvedCount }] = await db.select({
      unresolvedCount: sql<number>`COUNT(*)::int`,
    }).from(conversations).where(and(
      eq(conversations.clientId, clientId),
      eq(conversations.status, 'escalated'),
      isNull(conversations.resolvedAt),
    ));

    // Bot active status + business name
    const [client] = await db.select({
      isActive: clientConfigs.isActive,
      businessName: clientConfigs.businessName,
    }).from(clientConfigs).where(eq(clientConfigs.id, clientId)).limit(1);

    return NextResponse.json({
      conversations: rollup?.totalConversations ?? 0,
      messages:      rollup?.totalMessages ?? 0,
      escalations:   rollup?.totalEscalations ?? 0,
      avgResponseMs: 1200,
      unresolved:    unresolvedCount,
      botActive:     client?.isActive ?? false,
      businessName:  client?.businessName ?? '',
    });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

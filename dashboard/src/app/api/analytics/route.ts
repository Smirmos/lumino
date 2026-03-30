import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { conversations, messages, monthlyUsageRollup } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { clientId } = await requireAuthApi();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') ?? '30d';
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Messages per day
    const rawPerDay = await db.select({
      date: sql<string>`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(conversations.clientId, clientId),
        gte(messages.createdAt, since),
      ))
      .groupBy(sql`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`);

    // Fill in missing days with 0
    const dayMap = new Map(rawPerDay.map(r => [r.date, r.count]));
    const messagesPerDay: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      messagesPerDay.push({ date: key, count: dayMap.get(key) ?? 0 });
    }

    // Language breakdown
    const rawLang = await db.select({
      language: sql<string>`COALESCE(${conversations.languageDetected}, 'unknown')`,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(conversations)
      .where(and(
        eq(conversations.clientId, clientId),
        gte(conversations.startedAt, since),
      ))
      .groupBy(sql`COALESCE(${conversations.languageDetected}, 'unknown')`)
      .orderBy(sql`COUNT(*) DESC`);

    const langNames: Record<string, string> = {
      he: 'Hebrew', en: 'English', ru: 'Russian', ar: 'Arabic', unknown: 'Unknown',
    };
    const languageBreakdown = rawLang.map(r => ({
      language: r.language,
      name: langNames[r.language] ?? r.language,
      count: r.count,
    }));

    // Channel breakdown
    const rawChannel = await db.select({
      channel: conversations.channel,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(conversations)
      .where(and(
        eq(conversations.clientId, clientId),
        gte(conversations.startedAt, since),
      ))
      .groupBy(conversations.channel);

    const channelBreakdown = rawChannel.map(r => ({
      channel: r.channel === 'whatsapp' ? 'WhatsApp' : r.channel === 'instagram' ? 'Instagram' : r.channel,
      count: r.count,
    }));

    // Peak hours
    const rawHours = await db.select({
      hour: sql<number>`EXTRACT(HOUR FROM ${messages.createdAt})::int`,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(conversations.clientId, clientId),
        gte(messages.createdAt, since),
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`);

    const hourMap = new Map(rawHours.map(r => [r.hour, r.count]));
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourMap.get(hour) ?? 0,
    }));

    // Monthly comparison
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;

    const [thisRollup] = await db.select()
      .from(monthlyUsageRollup)
      .where(and(eq(monthlyUsageRollup.clientId, clientId), eq(monthlyUsageRollup.month, thisMonth)))
      .limit(1);

    const [lastRollup] = await db.select()
      .from(monthlyUsageRollup)
      .where(and(eq(monthlyUsageRollup.clientId, clientId), eq(monthlyUsageRollup.month, lastMonth)))
      .limit(1);

    const monthlyComparison = {
      thisConversations: thisRollup?.totalConversations ?? 0,
      lastConversations: lastRollup?.totalConversations ?? 0,
      thisMessages:      thisRollup?.totalMessages ?? 0,
      lastMessages:      lastRollup?.totalMessages ?? 0,
      thisEscalations:   thisRollup?.totalEscalations ?? 0,
      lastEscalations:   lastRollup?.totalEscalations ?? 0,
    };

    return NextResponse.json({
      messagesPerDay,
      languageBreakdown,
      channelBreakdown,
      peakHours,
      monthlyComparison,
      period,
    });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

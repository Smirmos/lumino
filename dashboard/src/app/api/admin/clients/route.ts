import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { users, clientConfigs, monthlyUsageRollup } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const { isAdmin } = await requireAuthApi();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-03"

    const clients = await db
      .select({
        userId: users.id,
        email: users.email,
        isActive: users.isActive,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        clientId: clientConfigs.id,
        businessName: clientConfigs.businessName,
        whatsappPhoneId: clientConfigs.whatsappPhoneId,
        instagramPageId: clientConfigs.instagramPageId,
      })
      .from(users)
      .leftJoin(clientConfigs, eq(users.clientId, clientConfigs.id))
      .orderBy(users.createdAt);

    // Get usage for current month
    const usage = await db
      .select({
        clientId: monthlyUsageRollup.clientId,
        totalMessages: monthlyUsageRollup.totalMessages,
        totalInputTokens: monthlyUsageRollup.totalInputTokens,
        totalOutputTokens: monthlyUsageRollup.totalOutputTokens,
      })
      .from(monthlyUsageRollup)
      .where(eq(monthlyUsageRollup.month, currentMonth));

    const usageMap = new Map(usage.map(u => [u.clientId, u]));

    const result = clients.map(c => {
      const u = c.clientId ? usageMap.get(c.clientId) : undefined;
      return {
        userId: c.userId,
        email: c.email,
        isActive: c.isActive,
        isAdmin: c.isAdmin,
        createdAt: c.createdAt,
        clientId: c.clientId,
        businessName: c.businessName,
        waConnected: !!c.whatsappPhoneId,
        igConnected: !!c.instagramPageId,
        monthMessages: u?.totalMessages ?? 0,
        monthInputTokens: u?.totalInputTokens ?? 0,
        monthOutputTokens: u?.totalOutputTokens ?? 0,
      };
    });

    // Summary stats
    const activeClients = clients.filter(c => c.isActive).length;

    return NextResponse.json({ clients: result, activeClients });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { clientConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const { clientId } = await requireAuthApi();

    // Get current state
    const [current] = await db.select({ isActive: clientConfigs.isActive })
      .from(clientConfigs)
      .where(eq(clientConfigs.id, clientId))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [updated] = await db.update(clientConfigs)
      .set({ isActive: !current.isActive, updatedAt: new Date() })
      .where(eq(clientConfigs.id, clientId))
      .returning({ isActive: clientConfigs.isActive });

    // Invalidate NestJS Redis cache (best-effort)
    if (process.env.NESTJS_INTERNAL_URL && process.env.INTERNAL_SECRET) {
      fetch(`${process.env.NESTJS_INTERNAL_URL}/internal/cache/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ clientId }),
      }).catch(() => {});
    }

    return NextResponse.json({ isActive: updated.isActive });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

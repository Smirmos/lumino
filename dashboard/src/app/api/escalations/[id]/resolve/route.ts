import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { conversations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { clientId } = await requireAuthApi();

    // Verify ownership
    const [conv] = await db.select({ id: conversations.id })
      .from(conversations)
      .where(and(
        eq(conversations.id, params.id),
        eq(conversations.clientId, clientId),
      ))
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [updated] = await db.update(conversations)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(eq(conversations.id, params.id))
      .returning({ id: conversations.id, status: conversations.status, resolvedAt: conversations.resolvedAt });

    return NextResponse.json(updated);
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

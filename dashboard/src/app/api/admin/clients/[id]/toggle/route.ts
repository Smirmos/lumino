import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, not } from 'drizzle-orm';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { isAdmin } = await requireAuthApi();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current state
    const [user] = await db.select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [updated] = await db.update(users)
      .set({ isActive: !user.isActive })
      .where(eq(users.id, params.id))
      .returning({ id: users.id, isActive: users.isActive });

    return NextResponse.json(updated);
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

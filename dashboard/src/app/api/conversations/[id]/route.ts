import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { clientId } = await requireAuthApi();

    // Verify ownership
    const [conv] = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.id, params.id),
        eq(conversations.clientId, clientId),
      ))
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const msgs = await db.select({
      id:                 messages.id,
      role:               messages.role,
      content:            messages.content,
      createdAt:          messages.createdAt,
      inputTokens:        messages.inputTokens,
      outputTokens:       messages.outputTokens,
      isEscalationTrigger: messages.isEscalationTrigger,
    })
      .from(messages)
      .where(eq(messages.conversationId, params.id))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({
      conversation: {
        ...conv,
        customerIdentifier: '***' + conv.customerIdentifier.slice(-4),
      },
      messages: msgs,
    });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

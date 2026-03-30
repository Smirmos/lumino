import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const { clientId } = await requireAuthApi();

    // Get escalated, unresolved conversations
    const escalated = await db.select({
      id:                 conversations.id,
      channel:            conversations.channel,
      customerIdentifier: conversations.customerIdentifier,
      escalatedAt:        conversations.escalatedAt,
      messageCount:       conversations.messageCount,
      languageDetected:   conversations.languageDetected,
    })
      .from(conversations)
      .where(and(
        eq(conversations.clientId, clientId),
        eq(conversations.status, 'escalated'),
        isNull(conversations.resolvedAt),
      ))
      .orderBy(desc(conversations.escalatedAt));

    // Get last message preview for each escalation
    const escalations = await Promise.all(
      escalated.map(async (conv) => {
        const [lastMsg] = await db.select({ content: messages.content })
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          id:                 conv.id,
          channel:            conv.channel,
          customerIdentifier: '***' + conv.customerIdentifier.slice(-4),
          escalatedAt:        conv.escalatedAt,
          messageCount:       conv.messageCount,
          languageDetected:   conv.languageDetected,
          lastMessagePreview: lastMsg?.content?.slice(0, 80) ?? '',
        };
      }),
    );

    return NextResponse.json({
      escalations,
      count: escalations.length,
    });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

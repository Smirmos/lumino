import { NextRequest, NextResponse } from 'next/server';

// Mock conversation detail with messages
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id;

  const conversation = {
    id,
    customerIdentifier: `hash00001234abcd`,
    channel: 'whatsapp' as const,
    status: id === 'conv-1' ? 'escalated' : 'active',
    messageCount: 6,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessageAt: new Date(Date.now() - 300000).toISOString(),
    languageDetected: 'he',
    escalatedAt: id === 'conv-1' ? new Date(Date.now() - 1800000).toISOString() : null,
    resolvedAt: null,
  };

  const messages = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'What are your opening hours?',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      inputTokens: null,
      outputTokens: null,
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Our hours are Sunday-Thursday 09:00-20:00, Friday 09:00-14:00. Would you like to book an appointment?',
      createdAt: new Date(Date.now() - 3595000).toISOString(),
      inputTokens: 85,
      outputTokens: 42,
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'Yes, can I come in on Tuesday at 3pm?',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      inputTokens: null,
      outputTokens: null,
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: 'Tuesday at 3pm works! You can book directly here: https://cal.com/dana. Is there anything else I can help with?',
      createdAt: new Date(Date.now() - 1795000).toISOString(),
      inputTokens: 120,
      outputTokens: 38,
    },
    {
      id: 'msg-5',
      role: 'user',
      content: 'How much does a haircut cost?',
      createdAt: new Date(Date.now() - 600000).toISOString(),
      inputTokens: null,
      outputTokens: null,
    },
    {
      id: 'msg-6',
      role: 'assistant',
      content: 'A haircut is 80 shekels. Color starts at 200 shekels. Would you like to add any additional services to your appointment?',
      createdAt: new Date(Date.now() - 595000).toISOString(),
      inputTokens: 150,
      outputTokens: 45,
    },
  ];

  return NextResponse.json({ conversation, messages });
}

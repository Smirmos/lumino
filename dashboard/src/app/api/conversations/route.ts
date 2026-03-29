import { NextRequest, NextResponse } from 'next/server';

// Mock conversations data for development
const mockConversations = Array.from({ length: 45 }, (_, i) => ({
  id: `conv-${i + 1}`,
  customerIdentifier: `hash${String(1000 + i).padStart(8, '0')}abcd`,
  channel: i % 3 === 0 ? 'instagram' : 'whatsapp',
  status: i < 3 ? 'escalated' : i < 15 ? 'active' : 'resolved',
  messageCount: Math.floor(Math.random() * 20) + 2,
  startedAt: new Date(Date.now() - (i * 3600000 + Math.random() * 3600000)).toISOString(),
  lastMessageAt: new Date(Date.now() - (i * 1800000 + Math.random() * 1800000)).toISOString(),
  languageDetected: ['he', 'ru', 'en'][i % 3],
  lastMessagePreview: [
    'What are your opening hours?',
    'I want to book an appointment for next week',
    'How much does a haircut cost?',
    'I need a refund for my last visit',
    'Do you have availability on Friday?',
    'Can I change my appointment time?',
    'What services do you offer?',
  ][i % 7],
}));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const status = searchParams.get('status');
  const channel = searchParams.get('channel');
  const q = searchParams.get('q');

  let filtered = [...mockConversations];

  if (status && status !== 'all') {
    filtered = filtered.filter((c) => c.status === status);
  }
  if (channel && channel !== 'all') {
    filtered = filtered.filter((c) => c.channel === channel);
  }
  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.lastMessagePreview.toLowerCase().includes(lower) ||
        c.customerIdentifier.includes(lower),
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = filtered.slice(offset, offset + limit);

  return NextResponse.json({ data, total, page, totalPages });
}

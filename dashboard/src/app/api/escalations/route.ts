import { NextResponse } from 'next/server';

// Mock escalation data for development
const mockEscalations = [
  {
    id: 'conv-1',
    customerIdentifier: 'hash00001234abcd',
    channel: 'whatsapp' as const,
    escalatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    lastMessagePreview: 'I want a refund for my last visit, the service was terrible and I am very unhappy...',
    messageCount: 5,
    languageDetected: 'en',
  },
  {
    id: 'conv-2',
    customerIdentifier: 'hash00005678efgh',
    channel: 'instagram' as const,
    escalatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    lastMessagePreview: 'This is unacceptable. I have been waiting for 3 days and nobody has contacted me...',
    messageCount: 8,
    languageDetected: 'en',
  },
  {
    id: 'conv-3',
    customerIdentifier: 'hash00009012ijkl',
    channel: 'whatsapp' as const,
    escalatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    lastMessagePreview: '\u05D0\u05E0\u05D9 \u05E8\u05D5\u05E6\u05D4 \u05D4\u05D7\u05D6\u05E8 \u05DB\u05E1\u05E4\u05D9 \u05D5\u05DC\u05D3\u05D1\u05E8 \u05E2\u05DD \u05DE\u05E0\u05D4\u05DC',
    messageCount: 3,
    languageDetected: 'he',
  },
];

export async function GET() {
  return NextResponse.json({
    escalations: mockEscalations,
    count: mockEscalations.length,
  });
}

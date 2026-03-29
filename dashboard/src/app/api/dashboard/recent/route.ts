import { NextResponse } from 'next/server';

// Mock data for development
export async function GET() {
  return NextResponse.json([
    {
      id: '1',
      customerIdentifier: 'abc123def456',
      channel: 'whatsapp',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: '2',
      customerIdentifier: 'xyz789ghi012',
      channel: 'instagram',
      status: 'escalated',
      lastMessageAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: '3',
      customerIdentifier: 'mno345pqr678',
      channel: 'whatsapp',
      status: 'resolved',
      lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: '4',
      customerIdentifier: 'stu901vwx234',
      channel: 'instagram',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
    {
      id: '5',
      customerIdentifier: 'yza567bcd890',
      channel: 'whatsapp',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ]);
}

import { NextResponse } from 'next/server';

// Mock data for development - replace with real DB queries in production
export async function GET() {
  return NextResponse.json({
    conversations: 142,
    messages: 856,
    escalations: 7,
    avgResponseMs: 1200,
    unresolved: 3,
    botActive: true,
    businessName: 'Demo Business',
  });
}

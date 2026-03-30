import { NextResponse } from 'next/server';

// Mock channel status for development
export async function GET() {
  return NextResponse.json({
    whatsapp: {
      connected: true,
      phoneNumberId: '1041888795676016',
      phoneDisplay: '+1 555 157 0837',
    },
    instagram: {
      connected: false,
      pageId: null,
      pageName: null,
      tokenExpiresAt: null,
      tokenExpiringSoon: false,
    },
  });
}

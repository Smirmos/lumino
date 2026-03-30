import { NextRequest, NextResponse } from 'next/server';

// Mock settings data for development
let mockSettings = {
  businessName: 'Lumino AI',
  services: 'AI Chatbot Setup 500 ILS, Monthly Support 200 ILS/mo, Custom Integration 1000 ILS',
  pricing: 'AI Chatbot Setup 500 ILS, Monthly Support 200 ILS/mo',
  businessHours: 'Sunday-Thursday 09:00-18:00, Friday 09:00-14:00',
  location: '',
  website: '',
  toneDescription: 'Friendly and professional',
  languages: ['auto'] as string[],
  fallbackMessage: 'Sorry, a temporary error occurred. Please try again.',
  escalationSla: '24 hours',
  canBook: false,
  bookingUrl: '',
  escalationKeywords: [] as string[],
  isActive: true,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json(mockSettings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  mockSettings = { ...mockSettings, ...body, updatedAt: new Date().toISOString() };
  return NextResponse.json({ success: true, updatedAt: mockSettings.updatedAt });
}

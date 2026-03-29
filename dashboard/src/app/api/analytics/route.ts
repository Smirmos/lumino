import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? '30d';
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

  // Mock: messages per day
  const messagesPerDay = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 40) + 5,
    };
  });

  // Mock: language breakdown
  const languageBreakdown = [
    { language: 'he', name: 'Hebrew', count: 245 },
    { language: 'ru', name: 'Russian', count: 89 },
    { language: 'en', name: 'English', count: 56 },
  ];

  // Mock: channel breakdown
  const channelBreakdown = [
    { channel: 'WhatsApp', count: 312 },
    { channel: 'Instagram', count: 78 },
  ];

  // Mock: peak hours
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hour >= 9 && hour <= 19
      ? Math.floor(Math.random() * 30) + 10
      : Math.floor(Math.random() * 5),
  }));

  // Mock: monthly comparison
  const monthlyComparison = {
    thisConversations: 142,
    lastConversations: 118,
    thisMessages: 856,
    lastMessages: 724,
    thisEscalations: 7,
    lastEscalations: 12,
  };

  return NextResponse.json({
    messagesPerDay,
    languageBreakdown,
    channelBreakdown,
    peakHours,
    monthlyComparison,
    period,
  });
}

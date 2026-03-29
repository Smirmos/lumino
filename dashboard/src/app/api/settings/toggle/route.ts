import { NextResponse } from 'next/server';

// Mock toggle - replace with real DB update in production
let isActive = true;

export async function POST() {
  isActive = !isActive;
  return NextResponse.json({ isActive });
}

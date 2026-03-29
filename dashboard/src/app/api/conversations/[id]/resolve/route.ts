import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // In production: UPDATE conversations SET status='resolved', resolved_at=NOW()
  return NextResponse.json({
    id: params.id,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  });
}

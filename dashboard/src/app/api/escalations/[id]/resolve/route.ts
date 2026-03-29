import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({
    id: params.id,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  });
}

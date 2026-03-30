import { NextRequest, NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { clientConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const settingsSchema = z.object({
  businessName:      z.string().min(1).optional(),
  services:          z.string().min(1).optional(),
  pricing:           z.string().nullable().optional(),
  businessHours:     z.string().min(1).optional(),
  location:          z.string().nullable().optional(),
  website:           z.string().nullable().optional(),
  toneDescription:   z.string().min(1).optional(),
  languages:         z.array(z.string()).optional(),
  fallbackMessage:   z.string().nullable().optional(),
  escalationSla:     z.string().nullable().optional(),
  canBook:           z.boolean().optional(),
  bookingUrl:        z.string().nullable().optional(),
  escalationKeywords: z.array(z.string()).nullable().optional(),
});

export async function GET() {
  try {
    const { clientId } = await requireAuthApi();

    const [config] = await db.select()
      .from(clientConfigs)
      .where(eq(clientConfigs.id, clientId))
      .limit(1);

    if (!config) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({
      businessName:      config.businessName,
      services:          config.services,
      pricing:           config.pricing,
      businessHours:     config.businessHours,
      location:          config.location,
      website:           config.website,
      toneDescription:   config.toneDescription,
      languages:         config.languages,
      fallbackMessage:   config.fallbackMessage,
      escalationSla:     config.escalationSla,
      canBook:           config.canBook,
      bookingUrl:        config.bookingUrl,
      escalationKeywords: config.escalationKeywords,
      isActive:          config.isActive,
      updatedAt:         config.updatedAt,
    });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { clientId } = await requireAuthApi();

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db.update(clientConfigs)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(clientConfigs.id, clientId))
      .returning({ updatedAt: clientConfigs.updatedAt });

    // Invalidate NestJS Redis cache (best-effort)
    if (process.env.NESTJS_INTERNAL_URL && process.env.INTERNAL_SECRET) {
      fetch(`${process.env.NESTJS_INTERNAL_URL}/internal/cache/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ clientId }),
      }).catch(() => {
        // Best-effort — cache will expire in 10 minutes anyway
      });
    }

    return NextResponse.json({ success: true, updatedAt: updated.updatedAt });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

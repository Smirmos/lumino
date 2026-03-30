import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth-session';
import { db } from '@/db';
import { clientConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { clientId } = await requireAuthApi();

    const [config] = await db.select({
      whatsappPhoneId: clientConfigs.whatsappPhoneId,
      instagramPageId: clientConfigs.instagramPageId,
    })
      .from(clientConfigs)
      .where(eq(clientConfigs.id, clientId))
      .limit(1);

    if (!config) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({
      whatsapp: {
        connected: !!config.whatsappPhoneId,
        phoneNumberId: config.whatsappPhoneId,
      },
      instagram: {
        connected: !!config.instagramPageId,
        pageId: config.instagramPageId,
      },
    });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }
}

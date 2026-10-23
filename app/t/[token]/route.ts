import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { scanEvents, vehicleTags, vehicles } from '@/lib/db/schema';
import { appUrl } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');

  const { token } = await params;

  const [tag] = await db
    .select({
      id: vehicleTags.id,
      type: vehicleTags.type,
      vehicleId: vehicleTags.vehicleId,
      status: vehicles.status,
      publicId: vehicles.publicId,
    })
    .from(vehicleTags)
    .innerJoin(vehicles, eq(vehicleTags.vehicleId, vehicles.id))
    .where(and(eq(vehicleTags.token, token), eq(vehicleTags.isActive, true)))
    .limit(1);

  if (!tag || tag.status === 'draft') {
    return NextResponse.redirect(appUrl() + '/', { status: 302, headers: response.headers });
  }

  await db.insert(scanEvents).values({
    vehicleId: tag.vehicleId,
    tagId: tag.id,
    source: tag.type,
  });

  await db
    .update(vehicles)
    .set({ viewCount: sql`${vehicles.viewCount} + 1` })
    .where(eq(vehicles.id, tag.vehicleId));

  const url = `${appUrl()}/v/${tag.publicId}?s=${encodeURIComponent(tag.type)}&logged=1`;
  return NextResponse.redirect(url, { status: 302, headers: response.headers });
}

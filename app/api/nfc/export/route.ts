import type { NextRequest } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { appUrl } from '@/lib/env';
import { newTagToken } from '@/lib/ids';
import { vehicleTags, vehicles } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const dealershipId = user.profile.dealershipId;

  const rows = await db
    .select({
      id: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      publicId: vehicles.publicId,
    })
    .from(vehicles)
    .where(and(eq(vehicles.dealershipId, dealershipId), eq(vehicles.status, 'active')));

  const vehicleIds = rows.map((r) => r.id);
  const tags = vehicleIds.length
    ? await db
        .select({ vehicleId: vehicleTags.vehicleId, token: vehicleTags.token })
        .from(vehicleTags)
        .where(and(inArray(vehicleTags.vehicleId, vehicleIds), eq(vehicleTags.isActive, true)))
    : [];

  const tokenByVehicle = new Map(tags.map((t) => [t.vehicleId, t.token]));
  const toCreate: { vehicleId: string; type: string; token: string; isActive: boolean; nfcUid: string | null }[] = [];
  const lines: { make: string; model: string; year: number; publicId: string; url: string }[] = [];

  for (const row of rows) {
    let token = tokenByVehicle.get(row.id);
    if (!token) {
      token = newTagToken();
      toCreate.push({ vehicleId: row.id, type: 'nfc', token, isActive: true, nfcUid: null });
    }
    lines.push({
      make: row.make,
      model: row.model,
      year: row.year,
      publicId: row.publicId,
      url: `${appUrl()}/t/${token}`,
    });
  }

  if (toCreate.length) {
    await db.insert(vehicleTags).values(toCreate);
  }

  const header = 'make,model,year,publicId,url';
  const body = lines
    .map((l) => `${l.make},${l.model},${l.year},${l.publicId},${l.url}`)
    .join('\r\n');

  return new Response('\uFEFF' + header + '\r\n' + body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="nfc-etiketleri.csv"',
    },
  });
}

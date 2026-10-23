import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { dealerships, vehicles } from '@/lib/db/schema';
import { buildStickerItem, isStickerFormat } from '@/lib/pdf/sticker';
import { renderStickersPdf } from '@/lib/pdf/sticker-doc';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const formatParam = request.nextUrl.searchParams.get('format');
  const format = isStickerFormat(formatParam) ? formatParam : 'a4';

  const [[vehicle], [dealership]] = await Promise.all([
    db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.dealershipId, user.profile.dealershipId)))
      .limit(1),
    db.select().from(dealerships).where(eq(dealerships.id, user.profile.dealershipId)).limit(1),
  ]);

  if (!vehicle || !dealership) return new Response('Araç bulunamadı.', { status: 404 });

  const item = await buildStickerItem(
    {
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      year: vehicle.year,
      mileageKm: vehicle.mileageKm,
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      horsepower: vehicle.horsepower,
      price: vehicle.price,
      currency: vehicle.currency,
      priceVisible: vehicle.priceVisible ?? true,
      publicId: vehicle.publicId,
    },
    {
      name: dealership.name,
      phone: dealership.phone,
      logoUrl: dealership.logoUrl,
      brandColor: dealership.brandColor,
    },
  );

  const buffer = await renderStickersPdf([item], format);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="etiket-${vehicle.publicId}.pdf"`,
    },
  });
}

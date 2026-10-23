import type { NextRequest } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { dealerships, vehicles } from '@/lib/db/schema';
import { buildStickerItem, isStickerFormat } from '@/lib/pdf/sticker';
import { renderStickersPdf } from '@/lib/pdf/sticker-doc';

export const runtime = 'nodejs';

const idsSchema = z
  .string()
  .transform((value) => value.split(',').map((v) => v.trim()).filter(Boolean))
  .refine((ids) => ids.length > 0 && ids.length <= 100, 'En fazla 100 araç seçebilirsiniz.')
  .refine((ids) => ids.every((id) => z.uuid().safeParse(id).success), 'Geçersiz araç kimliği.');

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const idsParam = request.nextUrl.searchParams.get('ids');
  const formatParam = request.nextUrl.searchParams.get('format');
  const format = isStickerFormat(formatParam) ? formatParam : 'a4';

  const parsed = idsSchema.safeParse(idsParam ?? '');
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'En fazla 100 araç seçebilirsiniz.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const vehicleRows = await db
    .select()
    .from(vehicles)
    .where(and(inArray(vehicles.id, parsed.data), eq(vehicles.dealershipId, user.profile.dealershipId)));

  if (vehicleRows.length === 0) {
    return new Response(JSON.stringify({ error: 'Seçilen araçlar bulunamadı.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const [dealership] = await db
    .select()
    .from(dealerships)
    .where(eq(dealerships.id, user.profile.dealershipId))
    .limit(1);
  if (!dealership) return new Response('Bayi bulunamadı.', { status: 404 });

  const items = [];
  for (const vehicle of vehicleRows) {
    items.push(
      await buildStickerItem(
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
      ),
    );
  }

  const buffer = await renderStickersPdf(items, format);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="etiketler.pdf"',
    },
  });
}

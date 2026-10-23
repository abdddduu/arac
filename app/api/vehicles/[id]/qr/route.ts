import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { vehicles } from '@/lib/db/schema';
import { qrPngBuffer, qrSvg, vehiclePublicUrl } from '@/lib/qr';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [vehicle] = await db
    .select({
      make: vehicles.make,
      model: vehicles.model,
      publicId: vehicles.publicId,
    })
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.dealershipId, user.profile.dealershipId)))
    .limit(1);

  if (!vehicle) return new Response(null, { status: 404 });

  const format = request.nextUrl.searchParams.get('format') ?? 'svg';
  const download = request.nextUrl.searchParams.get('download') === '1';
  const text = vehiclePublicUrl(vehicle?.publicId ?? '');
  const fileName = `qr-${vehicle?.make ?? 'arac'}-${vehicle?.model ?? 'arac'}-${vehicle?.publicId ?? 'arac'}`;

  if (format === 'png') {
    const buffer = await qrPngBuffer(text);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': download ? `attachment; filename="${fileName}.png"` : 'inline',
      },
    });
  }

  const svg = await qrSvg(text);
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'content-disposition': download ? `attachment; filename="${fileName}.svg"` : 'inline',
    },
  });
}

import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { scanEvents, vehicles } from '@/lib/db/schema';

export const runtime = 'nodejs';

const scanSchema = z.object({
  publicId: z.string().min(1).max(64),
  source: z.enum(['qr', 'nfc', 'share', 'direct']).default('direct'),
  referrer: z.string().max(500).optional().nullable(),
});

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  const { publicId, source, referrer } = parsed.data;

  const [vehicle] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.publicId, publicId))
    .limit(1);
  if (!vehicle) return new Response(null, { status: 404 });

  const ip = clientIp(request);
  const dailySalt = new Date().toISOString().slice(0, 10);
  const ipHash = createHash('sha256')
    .update(`${ip}|${dailySalt}|${publicId}`)
    .digest('hex')
    .slice(0, 32);

  const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 300);

  await db.insert(scanEvents).values({
    vehicleId: vehicle.id,
    source,
    userAgent,
    ipHash,
    referrer: referrer?.slice(0, 500) ?? null,
  });

  await db
    .update(vehicles)
    .set({ viewCount: sql`${vehicles.viewCount} + 1` })
    .where(eq(vehicles.id, vehicle.id));

  return new Response(null, { status: 204 });
}

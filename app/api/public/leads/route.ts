import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { leads, vehicles } from '@/lib/db/schema';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const CLICK_LIMIT = 30;
const TEST_DRIVE_LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

const leadSchema = z
  .object({
    publicId: z.string().min(1).max(64),
    type: z.enum(['test_drive', 'whatsapp_click', 'call_click']),
    name: z.string().min(2).max(80).optional(),
    phone: z.string().min(7).max(20).optional(),
    preferredAt: z.string().max(40).optional(),
    note: z.string().max(500).optional(),
    website: z.string().optional(),
  })
  .passthrough();

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function ipHash(ip: string) {
  const dailySalt = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${dailySalt}`).digest('hex').slice(0, 32);
}

export async function POST(request: NextRequest) {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponseJson({ ok: false }, 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponseJson({ ok: false }, 400);
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return NextResponseJson({ ok: false }, 400);

  const { publicId, type, name, phone, preferredAt, note, website } = parsed.data;

  if (website) return new Response(null, { status: 204 });

  const key = ipHash(clientIp(request));
  const isTestDrive = type === 'test_drive';
  if (isTestDrive) {
    if (!rateLimit(`test_drive:${key}`, TEST_DRIVE_LIMIT, WINDOW_MS)) {
      return NextResponseJson({ ok: false, error: 'Çok fazla talep gönderdiniz. Lütfen daha sonra tekrar deneyin.' }, 429);
    }
  } else if (!rateLimit(`click:${key}`, CLICK_LIMIT, WINDOW_MS)) {
    return new Response(null, { status: 204 });
  }

  if (isTestDrive && (!name || !phone)) {
    return NextResponseJson({ ok: false, error: 'Ad ve telefon zorunludur.' }, 400);
  }

  const [vehicle] = await db
    .select({ id: vehicles.id, dealershipId: vehicles.dealershipId })
    .from(vehicles)
    .where(eq(vehicles.publicId, publicId))
    .limit(1);
  if (!vehicle) return NextResponseJson({ ok: false }, 404);

  await db.insert(leads).values({
    vehicleId: vehicle.id,
    dealershipId: vehicle.dealershipId,
    type,
    name: name ?? null,
    phone: phone ?? null,
    preferredAt: preferredAt ? new Date(preferredAt) : null,
    note: note ?? null,
  });

  return NextResponseJson({ ok: true }, 201);
}

function NextResponseJson(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { media, vehicles } from '@/lib/db/schema';
import { mediaBucket } from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseVideoUrl } from '@/lib/video';
import type { ActionResult } from '@/components/vehicles/form/types';

const PHOTO_KINDS = new Set(['photo', 'document']);

async function verifyVehicle(vehicleId: string) {
  const { profile } = await requireUser();
  const [vehicle] = await db
    .select({ id: vehicles.id, publicId: vehicles.publicId })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  return vehicle ? { ...vehicle, dealershipId: profile.dealershipId } : null;
}

async function revalidateVehicle(vehicleId: string, publicId: string) {
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  revalidatePath(`/v/${publicId}`);
}

export async function createMediaUploadUrl(
  vehicleId: string,
  fileName: string,
  mimeType: string,
  kind: 'photo' | 'document',
): Promise<ActionResult & { path?: string; token?: string }> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };
  if (!PHOTO_KINDS.has(kind)) return { ok: false, error: 'Geçersiz medya türü.' };

  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = (extMatch ? extMatch[1] : mimeType === 'application/pdf' ? 'pdf' : 'img').toLowerCase();
  const path = `${vehicle.dealershipId}/${vehicleId}/${crypto.randomUUID()}-orig.${ext}`;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(mediaBucket())
    .createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? 'Yükleme başlatılamadı.' };

  return { ok: true, path, token: data.token };
}

export async function registerPhoto(vehicleId: string, path: string): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };
  if (!path.startsWith(`${vehicle.dealershipId}/${vehicleId}/`)) {
    return { ok: false, error: 'Geçersiz dosya yolu.' };
  }

  const supabase = createSupabaseAdminClient();
  const { data: original, error: downloadError } = await supabase.storage
    .from(mediaBucket())
    .download(path);
  if (downloadError || !original) return { ok: false, error: 'Orijinal dosya indirilemedi.' };

  const buf = Buffer.from(await original.arrayBuffer());
  const { default: sharp } = await import('sharp');
  const [sm, md, lg] = await Promise.all([
    sharp(buf).rotate().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    sharp(buf).rotate().resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    sharp(buf).rotate().resize({ width: 2048, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
  ]);

  const base = `${vehicle.dealershipId}/${vehicleId}`;
  const mediaId = crypto.randomUUID();
  const smPath = `${base}/${mediaId}-sm.webp`;
  const mdPath = `${base}/${mediaId}-md.webp`;
  const lgPath = `${base}/${mediaId}-lg.webp`;

  const uploads = await Promise.all([
    supabase.storage.from(mediaBucket()).upload(smPath, sm, { contentType: 'image/webp' }),
    supabase.storage.from(mediaBucket()).upload(mdPath, md, { contentType: 'image/webp' }),
    supabase.storage.from(mediaBucket()).upload(lgPath, lg, { contentType: 'image/webp' }),
  ]);
  if (uploads.some((r) => r.error)) {
    return { ok: false, error: 'Varyantlar yüklenemedi.' };
  }

  const metadata = await sharp(lg).metadata();
  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.vehicleId, vehicleId), eq(media.kind, 'photo')))
    .limit(1);

  await db.insert(media).values({
    vehicleId,
    dealershipId: vehicle.dealershipId,
    kind: 'photo',
    storagePath: path,
    variants: { sm: smPath, md: mdPath, lg: lgPath },
    mimeType: 'image/webp',
    sizeBytes: buf.length,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sortOrder: existing ? undefined : 1,
    isCover: !existing,
    isPublic: true,
  });

  await revalidateVehicle(vehicleId, vehicle.publicId);
  return { ok: true };
}

export async function registerDocument(
  vehicleId: string,
  path: string,
  title: string,
  mimeType: string,
  sizeBytes: number,
  isPublic: boolean,
): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };
  if (!path.startsWith(`${vehicle.dealershipId}/${vehicleId}/`)) {
    return { ok: false, error: 'Geçersiz dosya yolu.' };
  }

  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.vehicleId, vehicleId), eq(media.kind, 'document')))
    .limit(1);

  await db.insert(media).values({
    vehicleId,
    dealershipId: vehicle.dealershipId,
    kind: 'document',
    storagePath: path,
    title: title || null,
    mimeType,
    sizeBytes,
    sortOrder: existing ? undefined : 1,
    isPublic,
  });

  await revalidateVehicle(vehicleId, vehicle.publicId);
  return { ok: true };
}

export async function addVideoLink(vehicleId: string, url: string, title: string): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };

  const parsed = parseVideoUrl(url);
  if (parsed.provider === 'other') {
    return { ok: false, error: 'Geçersiz video bağlantısı. YouTube veya Vimeo bağlantısı girin.' };
  }

  await db.insert(media).values({
    vehicleId,
    dealershipId: vehicle.dealershipId,
    kind: 'video_link',
    externalUrl: parsed.embedUrl,
    provider: parsed.provider,
    title: title || null,
    isPublic: false,
  });

  await revalidateVehicle(vehicleId, vehicle.publicId);
  return { ok: true };
}

export async function reorderMedia(vehicleId: string, orderedIds: string[]): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(media)
        .set({ sortOrder: i + 1 })
        .where(and(eq(media.id, orderedIds[i]), eq(media.vehicleId, vehicleId)));
    }
  });

  await revalidateVehicle(vehicleId, vehicle.publicId);
  return { ok: true };
}

export async function updateMediaMeta(
  mediaId: string,
  data: { category?: string; isPublic?: boolean },
): Promise<ActionResult> {
  const { profile } = await requireUser();
  const [row] = await db
    .select({ id: media.id, vehicleId: media.vehicleId })
    .from(media)
    .innerJoin(vehicles, eq(media.vehicleId, vehicles.id))
    .where(and(eq(media.id, mediaId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  if (!row) return { ok: false, error: 'Medya bulunamadı.' };

  const changes: { category?: string; isPublic?: boolean } = {};
  if (data.category !== undefined) changes.category = data.category;
  if (data.isPublic !== undefined) changes.isPublic = !!data.isPublic;

  await db.update(media).set(changes).where(eq(media.id, mediaId));

  const [vehicle] = await db.select({ publicId: vehicles.publicId }).from(vehicles).where(eq(vehicles.id, row.vehicleId)).limit(1);
  await revalidateVehicle(row.vehicleId, vehicle?.publicId ?? '');
  return { ok: true };
}

export async function setCoverPhoto(vehicleId: string, mediaId: string): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };

  await db.transaction(async (tx) => {
    await tx.update(media).set({ isCover: false }).where(eq(media.vehicleId, vehicleId));
    await tx.update(media).set({ isCover: true }).where(and(eq(media.id, mediaId), eq(media.vehicleId, vehicleId)));
  });

  await revalidateVehicle(vehicleId, vehicle.publicId);
  return { ok: true };
}

export async function deleteMedia(mediaId: string): Promise<ActionResult> {
  const { profile } = await requireUser();
  const [row] = await db
    .select({ id: media.id, vehicleId: media.vehicleId, kind: media.kind, isCover: media.isCover, storagePath: media.storagePath, variants: media.variants })
    .from(media)
    .innerJoin(vehicles, eq(media.vehicleId, vehicles.id))
    .where(and(eq(media.id, mediaId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  if (!row) return { ok: false, error: 'Medya bulunamadı.' };

  const paths = [row.storagePath, row.variants?.sm, row.variants?.md, row.variants?.lg].filter((p): p is string => Boolean(p));
  const supabase = createSupabaseAdminClient();
  if (paths.length > 0) {
    await supabase.storage.from(mediaBucket()).remove(paths);
  }

  const wasCover = row.isCover;
  await db.delete(media).where(eq(media.id, mediaId));

  if (wasCover && row.kind === 'photo') {
    const [next] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.vehicleId, row.vehicleId), eq(media.kind, 'photo')))
      .orderBy(asc(media.sortOrder))
      .limit(1);
    if (next) {
      await db.update(media).set({ isCover: true }).where(eq(media.id, next.id));
    }
  }

  const [vehicle] = await db.select({ publicId: vehicles.publicId }).from(vehicles).where(eq(vehicles.id, row.vehicleId)).limit(1);
  await revalidateVehicle(row.vehicleId, vehicle?.publicId ?? '');
  return { ok: true };
}

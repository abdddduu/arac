'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { appUrl } from '@/lib/env';
import { newTagToken } from '@/lib/ids';
import { vehicleTags, vehicles } from '@/lib/db/schema';

export type PrepareResult = { ok: true; tagId: string; url: string } | { ok: false; error: string };

export async function prepareNfcTag(vehicleId: string): Promise<PrepareResult> {
  const { profile } = await requireUser();
  const [vehicle] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };

  const token = newTagToken();
  const [tag] = await db
    .insert(vehicleTags)
    .values({ vehicleId, type: 'nfc', token, isActive: false })
    .returning({ id: vehicleTags.id });
  return { ok: true, tagId: tag.id, url: `${appUrl()}/t/${token}` };
}

export async function confirmNfcTag(tagId: string, nfcUid: string) {
  const { profile } = await requireUser();
  const [tag] = await db
    .select({
      id: vehicleTags.id,
      vehicleId: vehicleTags.vehicleId,
      dealershipId: vehicles.dealershipId,
    })
    .from(vehicleTags)
    .innerJoin(vehicles, eq(vehicleTags.vehicleId, vehicles.id))
    .where(eq(vehicleTags.id, tagId))
    .limit(1);
  if (!tag || tag.dealershipId !== profile.dealershipId) return { ok: false, error: 'Etiket bulunamadı.' };

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: vehicleTags.id })
      .from(vehicleTags)
      .where(and(eq(vehicleTags.nfcUid, nfcUid), ne(vehicleTags.id, tagId)))
      .limit(1);
    const oldTag = existing[0];
    if (oldTag) {
      await tx
        .update(vehicleTags)
        .set({ isActive: false, nfcUid: null })
        .where(eq(vehicleTags.id, oldTag.id));
    }
    await tx
      .update(vehicleTags)
      .set({
        nfcUid,
        writtenAt: new Date(),
        isActive: true,
      })
      .where(eq(vehicleTags.id, tagId));
    await tx
      .update(vehicleTags)
      .set({ isActive: false })
      .where(and(eq(vehicleTags.vehicleId, tag.vehicleId), ne(vehicleTags.id, tagId), eq(vehicleTags.type, 'nfc')));
  });

  revalidatePath('/dashboard/nfc');
  return { ok: true };
}

export async function discardNfcTag(tagId: string) {
  const { profile } = await requireUser();
  const [tag] = await db
    .select({ id: vehicleTags.id, dealershipId: vehicles.dealershipId })
    .from(vehicleTags)
    .innerJoin(vehicles, eq(vehicleTags.vehicleId, vehicles.id))
    .where(eq(vehicleTags.id, tagId))
    .limit(1);
  if (!tag || tag.dealershipId !== profile.dealershipId) return;
  await db.delete(vehicleTags).where(eq(vehicleTags.id, tagId));
  revalidatePath('/dashboard/nfc');
}

export async function deactivateTag(tagId: string) {
  const { profile } = await requireUser();
  const [tag] = await db
    .select({ id: vehicleTags.id, dealershipId: vehicles.dealershipId })
    .from(vehicleTags)
    .innerJoin(vehicles, eq(vehicleTags.vehicleId, vehicles.id))
    .where(eq(vehicleTags.id, tagId))
    .limit(1);
  if (!tag || tag.dealershipId !== profile.dealershipId) return;
  await db.update(vehicleTags).set({ isActive: false }).where(eq(vehicleTags.id, tagId));
  revalidatePath('/dashboard/nfc');
}

export async function reassignTag(tagId: string, vehicleId: string) {
  const { profile } = await requireUser();
  const [tag] = await db
    .select({ id: vehicleTags.id, dealershipId: vehicles.dealershipId })
    .from(vehicleTags)
    .innerJoin(vehicles, eq(vehicleTags.vehicleId, vehicles.id))
    .where(eq(vehicleTags.id, tagId))
    .limit(1);
  if (!tag || tag.dealershipId !== profile.dealershipId) return;

  const [target] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  if (!target) return;

  await db.transaction(async (tx) => {
    await tx.update(vehicleTags).set({ vehicleId }).where(eq(vehicleTags.id, tagId));
    await tx
      .update(vehicleTags)
      .set({ isActive: false })
      .where(and(eq(vehicleTags.vehicleId, vehicleId), ne(vehicleTags.id, tagId), eq(vehicleTags.type, 'nfc')));
    await tx.update(vehicleTags).set({ isActive: true }).where(eq(vehicleTags.id, tagId));
  });

  revalidatePath('/dashboard/nfc');
}

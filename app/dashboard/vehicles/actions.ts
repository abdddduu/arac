'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { requireRole, requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { mediaBucket } from '@/lib/env';
import { vehicles } from '@/lib/db/schema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { VehicleStatus } from '@/lib/status-rules';

export async function updateVehicleStatus(vehicleId: string, status: VehicleStatus) {
  const { profile } = await requireUser();

  const [vehicle] = await db
    .select({
      id: vehicles.id,
      publicId: vehicles.publicId,
      publishedAt: vehicles.publishedAt,
    })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  if (!vehicle) return;

  const values: Partial<typeof vehicles.$inferInsert> = { status };
  if (status === 'sold') values.soldAt = new Date();
  if (status === 'active' && !vehicle.publishedAt) values.publishedAt = new Date();

  await db.update(vehicles).set(values).where(eq(vehicles.id, vehicleId));

  revalidatePath('/dashboard/vehicles');
  revalidatePath('/dashboard');
  revalidatePath(`/v/${vehicle.publicId}`);
}

export async function deleteVehicle(vehicleId: string) {
  const { profile } = await requireRole(['owner', 'manager']);

  const [vehicle] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  if (!vehicle) redirect('/dashboard/vehicles');

  const supabase = createSupabaseAdminClient();
  const folder = `${profile.dealershipId}/${vehicleId}`;
  const { data: objects } = await supabase.storage
    .from(mediaBucket())
    .list(folder, { limit: 1000 });
  const paths = (objects ?? []).filter((o) => o.id).map((o) => `${folder}/${o.name}`);
  if (paths.length > 0) {
    await supabase.storage.from(mediaBucket()).remove(paths);
  }

  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));

  redirect('/dashboard/vehicles');
}

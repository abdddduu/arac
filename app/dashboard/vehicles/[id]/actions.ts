'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import {
  mechanicalChecks,
  tires,
  tramerRecords,
  vehiclePanels,
  vehicles,
} from '@/lib/db/schema';
import { conditionSchema, vehicleBasicSchema, vehicleEngineSchema } from '@/lib/validation/vehicle';
import type { ActionResult } from '@/components/vehicles/form/types';

async function verifyVehicle(vehicleId: string) {
  const { profile } = await requireUser();
  const [vehicle] = await db
    .select({ id: vehicles.id, publicId: vehicles.publicId })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.dealershipId, profile.dealershipId)))
    .limit(1);
  return vehicle ?? null;
}

function toFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? 'form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function isUniqueViolation(error: unknown) {
  const err = error as { code?: string };
  return err?.code === '23505';
}

export async function updateVehicleBasic(vehicleId: string, input: unknown): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };

  const parsed = vehicleBasicSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Lütfen formdaki hataları düzeltin.', fieldErrors: toFieldErrors(parsed.error) };
  }
  const values = parsed.data;

  try {
    await db
      .update(vehicles)
      .set({
        make: values.make,
        model: values.model,
        trim: values.trim ?? null,
        year: values.year,
        vin: values.vin,
        plate: values.plate ?? null,
        mileageKm: values.mileageKm,
        bodyType: values.bodyType ?? null,
        color: values.color ?? null,
        price: values.price !== undefined ? String(values.price) : null,
        currency: values.currency,
        priceVisible: values.priceVisible,
        isNegotiable: values.isNegotiable,
        description: values.description ?? null,
        features: values.features,
      })
      .where(eq(vehicles.id, vehicleId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: 'Bu şase numarası zaten kayıtlı.', fieldErrors: { vin: 'Bu şase numarası zaten kayıtlı' } };
    }
    throw error;
  }

  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  revalidatePath(`/v/${vehicle.publicId}`);
  return { ok: true };
}

export async function updateVehicleEngine(vehicleId: string, input: unknown): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };

  const parsed = vehicleEngineSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Lütfen formdaki hataları düzeltin.', fieldErrors: toFieldErrors(parsed.error) };
  }
  const values = parsed.data;

  await db
    .update(vehicles)
    .set({
      fuel: values.fuel,
      transmission: values.transmission,
      drivetrain: values.drivetrain ?? null,
      engineCc: values.engineCc ?? null,
      horsepower: values.horsepower ?? null,
      torqueNm: values.torqueNm ?? null,
      batteryKwh: values.batteryKwh !== undefined ? String(values.batteryKwh) : null,
      rangeKm: values.rangeKm ?? null,
      previousOwners: values.previousOwners ?? null,
      warrantyUntil: values.warrantyUntil ?? null,
    })
    .where(eq(vehicles.id, vehicleId));

  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  revalidatePath(`/v/${vehicle.publicId}`);
  return { ok: true };
}

export async function updateVehicleCondition(vehicleId: string, input: unknown): Promise<ActionResult> {
  const vehicle = await verifyVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: 'Araç bulunamadı.' };

  const parsed = conditionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Lütfen formdaki hataları düzeltin.', fieldErrors: toFieldErrors(parsed.error) };
  }
  const values = parsed.data;

  await db.transaction(async (tx) => {
    for (const panel of values.panels) {
      await tx
        .insert(vehiclePanels)
        .values({
          vehicleId,
          panel: panel.panel,
          state: panel.state,
          paintMicrons: panel.paintMicrons ?? null,
          note: panel.note ?? null,
        })
        .onConflictDoUpdate({
          target: [vehiclePanels.vehicleId, vehiclePanels.panel],
          set: {
            state: panel.state,
            paintMicrons: panel.paintMicrons ?? null,
            note: panel.note ?? null,
          },
        });
    }

    await tx.delete(tramerRecords).where(eq(tramerRecords.vehicleId, vehicleId));
    if (values.tramerRecords.length > 0) {
      await tx.insert(tramerRecords).values(
        values.tramerRecords.map((record) => ({
          vehicleId,
          incidentDate: record.incidentDate ?? null,
          amount: String(record.amount),
          description: record.description ?? null,
        })),
      );
    }

    const total = values.tramerRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    await tx
      .update(vehicles)
      .set({
        tramerTotalAmount: String(total),
        hasHeavyDamage: values.hasHeavyDamage,
        tuvturkValidUntil: values.tuvturkValidUntil ?? null,
      })
      .where(eq(vehicles.id, vehicleId));

    for (const tire of values.tires) {
      await tx
        .insert(tires)
        .values({
          vehicleId,
          position: tire.position,
          brand: tire.brand ?? null,
          size: tire.size ?? null,
          season: tire.season ?? null,
          treadMm: tire.treadMm !== undefined ? String(tire.treadMm) : null,
          dotYear: tire.dotYear ?? null,
        })
        .onConflictDoUpdate({
          target: [tires.vehicleId, tires.position],
          set: {
            brand: tire.brand ?? null,
            size: tire.size ?? null,
            season: tire.season ?? null,
            treadMm: tire.treadMm !== undefined ? String(tire.treadMm) : null,
            dotYear: tire.dotYear ?? null,
          },
        });
    }

    await tx.delete(mechanicalChecks).where(eq(mechanicalChecks.vehicleId, vehicleId));
    if (values.mechanicalChecks.length > 0) {
      await tx.insert(mechanicalChecks).values(
        values.mechanicalChecks.map((check) => ({
          vehicleId,
          category: check.category,
          status: check.status,
          note: check.note ?? null,
        })),
      );
    }
  });

  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  revalidatePath(`/v/${vehicle.publicId}`);
  return { ok: true };
}

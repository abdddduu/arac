'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { newPublicId } from '@/lib/ids';
import { PANEL_CODES } from '@/lib/status-rules';
import { tires, vehiclePanels, vehicles } from '@/lib/db/schema';
import { vehicleBasicSchema } from '@/lib/validation/vehicle';
import type { ActionResult } from '@/components/vehicles/form/types';

const schema = vehicleBasicSchema.extend({
  drivetrain: z.enum(['fwd', 'rwd', 'awd', '4wd']).optional(),
  fuel: z.enum(['gasoline', 'diesel', 'lpg', 'hybrid', 'plugin_hybrid', 'electric']),
  transmission: z.enum(['manual', 'automatic', 'semi_automatic', 'cvt', 'dct']),
});

export async function createVehicle(input: unknown): Promise<ActionResult | void> {
  const { profile } = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: 'Lütfen formdaki hataları düzeltin.', fieldErrors };
  }

  const values = parsed.data;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [vehicle] = await db
        .insert(vehicles)
        .values({
          dealershipId: profile.dealershipId,
          createdBy: profile.id,
          publicId: newPublicId(),
          status: 'draft',
          make: values.make,
          model: values.model,
          trim: values.trim ?? null,
          year: values.year,
          vin: values.vin,
          plate: values.plate ?? null,
          mileageKm: values.mileageKm,
          bodyType: values.bodyType ?? null,
          color: values.color ?? null,
          fuel: values.fuel,
          transmission: values.transmission,
          drivetrain: values.drivetrain ?? null,
          price: values.price !== undefined ? String(values.price) : null,
          currency: values.currency,
          priceVisible: values.priceVisible,
          isNegotiable: values.isNegotiable,
          description: values.description ?? null,
          features: values.features,
        })
        .returning({ id: vehicles.id });
      if (!vehicle) return { ok: false, error: 'Araç oluşturulamadı.' };

      await Promise.all([
        db.insert(vehiclePanels).values(
          PANEL_CODES.map((panel) => ({ vehicleId: vehicle.id, panel, state: 'original' as const })),
        ),
        db
          .insert(tires)
          .values(['FL', 'FR', 'RL', 'RR'].map((position) => ({ vehicleId: vehicle.id, position }))),
      ]);

      redirect(`/dashboard/vehicles/${vehicle.id}?tab=engine`);
    } catch (error) {
      const err = error as { code?: string; constraint?: string; constraint_name?: string };
      if (err.code === '23505') {
        const name = err.constraint_name ?? err.constraint ?? '';
        if (name.includes('vin')) {
          return {
            ok: false,
            error: 'Bu şase numarası zaten kayıtlı.',
            fieldErrors: { vin: 'Bu şase numarası zaten kayıtlı' },
          };
        }
        continue;
      }
      throw error;
    }
  }

  return { ok: false, error: 'Araç oluşturulamadı, lütfen tekrar deneyin.' };
}


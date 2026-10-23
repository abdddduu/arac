import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { media, scanEvents, vehicles } from '@/lib/db/schema';
import { publicMediaUrl } from '@/lib/media-url';
import { STATUS_LABELS_TR, type VehicleStatus } from '@/lib/status-rules';
import { ButtonLink, Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { VehicleTable } from '@/components/vehicles/vehicle-table';

const STATUS_VALUES = Object.keys(STATUS_LABELS_TR) as VehicleStatus[];

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { profile } = await requireUser();
  const params = await searchParams;
  const dealershipId = profile.dealershipId;

  const q = (params.q ?? '').trim();
  const status = (STATUS_VALUES as string[]).includes(params.status ?? '')
    ? (params.status as VehicleStatus)
    : null;

  const conditions = [eq(vehicles.dealershipId, dealershipId), ...(status ? [eq(vehicles.status, status)] : [])];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(ilike(vehicles.make, pattern), ilike(vehicles.model, pattern), ilike(vehicles.plate, pattern), ilike(vehicles.vin, pattern))!,
    );
  }

  const vehicleRows = await db
    .select({
      id: vehicles.id,
      publicId: vehicles.publicId,
      status: vehicles.status,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      plate: vehicles.plate,
      mileageKm: vehicles.mileageKm,
      price: vehicles.price,
      createdAt: vehicles.createdAt,
    })
    .from(vehicles)
    .where(and(...conditions))
    .orderBy(desc(vehicles.createdAt));

  const [mediaRows, scanRows] = await Promise.all([
    db
      .select({
        vehicleId: media.vehicleId,
        isCover: media.isCover,
        storagePath: media.storagePath,
        variants: media.variants,
        sortOrder: media.sortOrder,
      })
      .from(media)
      .where(
        and(inArray(media.vehicleId, vehicleRows.map((v) => v.id)), eq(media.kind, 'photo')),
      )
      .orderBy(asc(media.sortOrder)),
    db
      .select({ vehicleId: scanEvents.vehicleId, value: count() })
      .from(scanEvents)
      .where(inArray(scanEvents.vehicleId, vehicleRows.map((v) => v.id)))
      .groupBy(scanEvents.vehicleId),
  ]);

  const mediaByVehicle = new Map<string, typeof mediaRows>();
  for (const row of mediaRows) {
    const list = mediaByVehicle.get(row.vehicleId) ?? [];
    list.push(row);
    mediaByVehicle.set(row.vehicleId, list);
  }
  const scanCountByVehicle = new Map(scanRows.map((r) => [r.vehicleId, r.value]));

  const rows = vehicleRows.map((vehicle) => {
    const photos = mediaByVehicle.get(vehicle.id) ?? [];
    const cover = photos.find((p) => p.isCover) ?? photos[0];
    const coverPath = cover?.variants?.md ?? cover?.storagePath ?? null;
    return {
      id: vehicle.id,
      publicId: vehicle.publicId,
      status: vehicle.status,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      plate: vehicle.plate,
      mileageKm: vehicle.mileageKm,
      price: vehicle.price,
      coverUrl: coverPath ? publicMediaUrl(coverPath) : null,
      scanCount: scanCountByVehicle.get(vehicle.id) ?? 0,
    };
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Araçlar</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} araç</p>
        </div>
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="Ara" className="min-w-60 flex-1">
          <Input name="q" defaultValue={q} placeholder="Marka, model, plaka, VIN…" />
        </Field>
        <Field label="Durum">
          <Select name="status" defaultValue={status ?? 'all'} className="min-w-40">
            <option value="all">Tümü</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS_TR[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="secondary">
          Filtrele
        </Button>
        {(q || status) && (
          <ButtonLink href="/dashboard/vehicles" variant="ghost">
            Temizle
          </ButtonLink>
        )}
      </form>

      <div className="mt-6">
        <VehicleTable rows={rows} />
      </div>
    </div>
  );
}

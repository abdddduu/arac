import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, count, eq, gte } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { scanEvents, vehicles } from '@/lib/db/schema';
import { appUrl } from '@/lib/env';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeleteVehicleButton } from '@/components/vehicles/delete-vehicle-button';
import { BasicForm } from '@/components/vehicles/form/basic-form';
import { EngineForm } from '@/components/vehicles/form/engine-form';
import { ConditionForm } from '@/components/vehicles/form/condition-form';
import { MediaManager } from '@/components/vehicles/media-manager';
import { PublishPanel } from '@/components/vehicles/publish-panel';

export const maxDuration = 60;

const TABS = ['basic', 'engine', 'condition', 'media', 'publish'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  basic: 'Temel Bilgiler',
  engine: 'Motor & Şanzıman',
  condition: 'Durum Raporu',
  media: 'Medya',
  publish: 'Yayınla & QR',
};

export default async function VehicleEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { profile } = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'basic';

  const vehicle = await db.query.vehicles.findFirst({
    where: and(eq(vehicles.id, id), eq(vehicles.dealershipId, profile.dealershipId)),
    with: {
      panels: true,
      tires: true,
      tramerRecords: { orderBy: (tramer, { asc: ascFn }) => [ascFn(tramer.createdAt)] },
      mechanicalChecks: true,
      media: { orderBy: (mediaTable, { asc: ascFn }) => [ascFn(mediaTable.sortOrder), ascFn(mediaTable.createdAt)] },
    },
  });
  if (!vehicle) notFound();

  const photos = vehicle.media.filter((m) => m.kind === 'photo');
  const videos = vehicle.media.filter((m) => m.kind === 'video_link');
  const documents = vehicle.media.filter((m) => m.kind === 'document');

  const [totalScans, recentScans] = await Promise.all([
    db
      .select({ value: count() })
      .from(scanEvents)
      .where(eq(scanEvents.vehicleId, id)),
    db
      .select({ value: count() })
      .from(scanEvents)
      .where(and(eq(scanEvents.vehicleId, id), gte(scanEvents.createdAt, new Date(Date.now() - 7 * 86_400_000)))),
  ]);

  const publicUrl = `${appUrl()}/v/${vehicle.publicId}`;
  const canDelete = profile.role === 'owner' || profile.role === 'manager';

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {vehicle.make} {vehicle.model} · {vehicle.year}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={vehicle.status} />
            <a
              href={`/v/${vehicle.publicId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              {publicUrl}
            </a>
            {vehicle.plate && <span className="text-sm text-slate-500">{vehicle.plate}</span>}
          </div>
        </div>
        {canDelete && <DeleteVehicleButton vehicleId={id} />}
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/dashboard/vehicles/${id}?tab=${t}`}
            className={[
              'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t
                ? 'border-slate-900 bg-slate-50 text-slate-900'
                : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      <div className="mt-6 max-w-4xl">
        {tab === 'basic' && (
          <BasicForm
            vehicleId={id}
            defaultValues={{
              make: vehicle.make,
              model: vehicle.model,
              trim: vehicle.trim ?? undefined,
              year: vehicle.year,
              vin: vehicle.vin,
              plate: vehicle.plate ?? undefined,
              mileageKm: vehicle.mileageKm,
              bodyType: vehicle.bodyType ?? undefined,
              color: vehicle.color ?? undefined,
              price: vehicle.price !== null ? Number(vehicle.price) : undefined,
              currency: vehicle.currency ?? 'TRY',
              priceVisible: vehicle.priceVisible ?? true,
              isNegotiable: vehicle.isNegotiable ?? false,
              description: vehicle.description ?? undefined,
              features: vehicle.features ?? [],
            }}
          />
        )}
        {tab === 'engine' && (
          <EngineForm
            vehicleId={id}
            defaultValues={{
              fuel: vehicle.fuel,
              transmission: vehicle.transmission,
              drivetrain: vehicle.drivetrain ?? undefined,
              engineCc: vehicle.engineCc ?? undefined,
              horsepower: vehicle.horsepower ?? undefined,
              torqueNm: vehicle.torqueNm ?? undefined,
              batteryKwh: vehicle.batteryKwh !== null ? Number(vehicle.batteryKwh) : undefined,
              rangeKm: vehicle.rangeKm ?? undefined,
              previousOwners: vehicle.previousOwners ?? undefined,
              warrantyUntil: vehicle.warrantyUntil ?? undefined,
            }}
          />
        )}
        {tab === 'condition' && (
          <ConditionForm
            vehicleId={id}
            defaultValues={{
              panels: vehicle.panels.map((p) => ({
                panel: p.panel,
                state: p.state,
                paintMicrons: p.paintMicrons ?? undefined,
                note: p.note ?? undefined,
              })),
              tramerRecords: vehicle.tramerRecords.map((r) => ({
                incidentDate: r.incidentDate ?? undefined,
                amount: Number(r.amount),
                description: r.description ?? undefined,
              })),
              hasHeavyDamage: vehicle.hasHeavyDamage ?? false,
              tuvturkValidUntil: vehicle.tuvturkValidUntil ?? undefined,
              tires: vehicle.tires.map((t) => ({
                position: t.position as 'FL' | 'FR' | 'RL' | 'RR' | 'SPARE',
                brand: t.brand ?? undefined,
                size: t.size ?? undefined,
                season: t.season ?? undefined,
                treadMm: t.treadMm !== null ? Number(t.treadMm) : undefined,
                dotYear: t.dotYear ?? undefined,
              })),
              mechanicalChecks: vehicle.mechanicalChecks.map((c) => ({
                category: c.category,
                status: c.status as 'ok' | 'attention' | 'fault',
                note: c.note ?? undefined,
              })),
            }}
          />
        )}
        {tab === 'media' && (
          <MediaManager
            vehicleId={id}
            photos={photos}
            videos={videos}
            documents={documents}
          />
        )}
        {tab === 'publish' && (
          <PublishPanel
            vehicleId={id}
            status={vehicle.status}
            publicUrl={publicUrl}
            hasPhoto={photos.length > 0}
            hasPrice={vehicle.price !== null}
            conditionFilled={
              vehicle.panels.some((p) => p.state !== 'original') ||
              vehicle.tuvturkValidUntil !== null ||
              vehicle.tires.some((t) => t.treadMm !== null)
            }
            tuvturkSet={vehicle.tuvturkValidUntil !== null}
            totalScans={totalScans[0]?.value ?? 0}
            recentScans={recentScans[0]?.value ?? 0}
          />
        )}
      </div>
    </div>
  );
}

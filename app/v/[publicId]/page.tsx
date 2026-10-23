import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Battery,
  Car,
  ChevronDown,
  Cpu,
  FileText,
  Fuel,
  Gauge,
  MapPin,
  Paintbrush,
  ShieldAlert,
  Snowflake,
  Users,
  Zap,
} from 'lucide-react';
import { getPublicVehicle, getSimilarVehicles } from '@/lib/public-vehicle';
import { formatKm, formatPrice } from '@/lib/utils';
import {
  DRIVETRAIN_LABELS_TR,
  FUEL_LABELS_TR,
  PANEL_LABELS_TR,
  PANEL_STATE_COLORS,
  PANEL_STATE_LABELS_TR,
  TRANSMISSION_LABELS_TR,
} from '@/lib/status-rules';
import { CarDiagram } from '@/components/vehicles/car-diagram';
import { Gallery } from '@/components/public/gallery';
import { CtaBar } from '@/components/public/cta-bar';
import { ScanBeacon } from '@/components/public/scan-beacon';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const revalidate = 300;
export const dynamicParams = true;

type Props = {
  params: Promise<{ publicId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params;
  const vehicle = await getPublicVehicle(publicId);
  if (!vehicle) return { title: 'Araç Bulunamadı' };
  const cover = vehicle.photos[0]?.lg;
  const description = `${vehicle.year} ${vehicle.make} ${vehicle.model} — ${formatKm(vehicle.mileageKm)}, ${FUEL_LABELS_TR[vehicle.fuel as keyof typeof FUEL_LABELS_TR] ?? vehicle.fuel}, ${TRANSMISSION_LABELS_TR[vehicle.transmission as keyof typeof TRANSMISSION_LABELS_TR] ?? vehicle.transmission}, ${vehicle.priceVisible && vehicle.price !== null ? formatPrice(vehicle.price, vehicle.currency) : 'Fiyat bilgisi için iletişime geçin'}`;
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model} – ${vehicle.dealership.name}`,
    description,
    openGraph: cover
      ? {
          images: [{ url: cover }],
        }
      : undefined,
  };
}

export default async function PublicVehiclePage({ params }: Props) {
  const { publicId } = await params;
  const vehicle = await getPublicVehicle(publicId);
  if (!vehicle) notFound();

  const sold = vehicle.status === 'sold';
  const reserved = vehicle.status === 'reserved';

  const similar = sold ? await getSimilarVehicles(vehicle.dealershipId, vehicle.id, 4).catch(() => []) : [];

  const fuelLabel = FUEL_LABELS_TR[vehicle.fuel as keyof typeof FUEL_LABELS_TR] ?? vehicle.fuel;
  const transmissionLabel =
    TRANSMISSION_LABELS_TR[vehicle.transmission as keyof typeof TRANSMISSION_LABELS_TR] ?? vehicle.transmission;
  const drivetrainLabel = vehicle.drivetrain
    ? DRIVETRAIN_LABELS_TR[vehicle.drivetrain as keyof typeof DRIVETRAIN_LABELS_TR] ?? vehicle.drivetrain
    : null;

  const priceLabel =
    vehicle.priceVisible && vehicle.price !== null
      ? formatPrice(vehicle.price, vehicle.currency)
      : 'Fiyat için iletişime geçin';

  const mapsQuery = encodeURIComponent(
    [vehicle.dealership.address, vehicle.dealership.district, vehicle.dealership.city]
      .filter(Boolean)
      .join(', '),
  );

  const nonOriginalPanels = vehicle.panelList.filter((p) => p.state !== 'original');
  const paintedCount = vehicle.panelList.filter((p) => ['painted', 'local_paint', 'plastic_repair'].includes(p.state)).length;
  const replacedCount = vehicle.panelList.filter((p) => p.state === 'replaced').length;

  const paintVerdict =
    paintedCount === 0 && replacedCount === 0
      ? 'Tamamen orijinal'
      : `${paintedCount} parça boyalı, ${replacedCount} parça değişen`;

  const tramerVerdict =
    vehicle.tramerTotalAmount > 0
      ? `${formatPrice(vehicle.tramerTotalAmount, vehicle.currency)}${vehicle.hasHeavyDamage ? ' · Ağır hasar kayıtlı' : ''}`
      : 'Hasar kaydı yok';

  const tuvturkVerdict =
    vehicle.tuvturkValidUntil === null
      ? 'Bilgi yok'
      : vehicle.tuvturkDaysLeft === null
        ? 'Bilgi yok'
        : vehicle.tuvturkDaysLeft < 0
          ? 'Süresi dolmuş'
          : vehicle.tuvturkDaysLeft <= 90
            ? 'Yaklaşıyor'
            : `Muayene geçerli – ${vehicle.tuvturkDaysLeft} gün`;

  const tireVerdicts = vehicle.mainTires.map((t) => t.treadMm).filter((v) => v !== null) as number[];
  const tireVerdict =
    tireVerdicts.length === 0
      ? 'Bilgi yok'
      : `Ort. ${Math.round(tireVerdicts.reduce((a, b) => a + b, 0) / tireVerdicts.length)} mm`;

  const specs: { icon: typeof Car; label: string; value: string }[] = [
    { icon: Fuel, label: 'Yakıt', value: fuelLabel },
    { icon: Cpu, label: 'Şanzıman', value: transmissionLabel },
    ...(drivetrainLabel ? [{ icon: Gauge, label: 'Çekiş', value: drivetrainLabel }] : []),
    ...(vehicle.horsepower ? [{ icon: Zap, label: 'Güç', value: `${vehicle.horsepower} HP` }] : []),
    ...(vehicle.torqueNm ? [{ icon: Gauge, label: 'Tork', value: `${vehicle.torqueNm} Nm` }] : []),
    ...(vehicle.engineCc ? [{ icon: Cpu, label: 'Motor Hacmi', value: `${vehicle.engineCc} cc` }] : []),
    ...(vehicle.batteryKwh ? [{ icon: Battery, label: 'Batarya', value: `${vehicle.batteryKwh} kWh` }] : []),
    ...(vehicle.rangeKm ? [{ icon: Gauge, label: 'Menzil', value: `${vehicle.rangeKm} km` }] : []),
    ...(vehicle.color ? [{ icon: Paintbrush, label: 'Renk', value: vehicle.color }] : []),
    ...(vehicle.bodyType ? [{ icon: Car, label: 'Kasa Tipi', value: vehicle.bodyType }] : []),
    ...(vehicle.previousOwners !== null ? [{ icon: Users, label: 'Önceki Sahip', value: `${vehicle.previousOwners}` }] : []),
    ...(vehicle.warrantyUntil ? [{ icon: ShieldAlert, label: 'Garanti', value: vehicle.warrantyUntil }] : []),
    { icon: Car, label: 'Şase No', value: vehicle.maskedVin },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    brand: { '@type': 'Brand', name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.mileageKm,
      unitCode: 'KMT',
    },
    fuelType: vehicle.fuel,
    vehicleTransmission: vehicle.transmission,
    offers: {
      '@type': 'Offer',
      price: vehicle.priceVisible && vehicle.price !== null ? vehicle.price : undefined,
      priceCurrency: vehicle.currency,
      availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
    seller: { '@type': 'LocalBusiness', name: vehicle.dealership.name },
  };

  return (
    <main className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style>{`:root { --brand: ${vehicle.dealership.brandColor || '#0F172A'}; }`}</style>
      <ScanBeacon publicId={vehicle.publicId} />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {vehicle.dealership.logoUrl ? (
              <img
                src={vehicle.dealership.logoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--brand, #0F172A)' }}
              >
                {vehicle.dealership.name.charAt(0)}
              </span>
            )}
            <span className="truncate text-sm font-semibold text-slate-900">{vehicle.dealership.name}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-900">{priceLabel}</p>
            {sold ? (
              <Badge variant="red">Satıldı</Badge>
            ) : reserved ? (
              <Badge variant="amber">Rezerve</Badge>
            ) : (
              <Badge variant="green">Satışta</Badge>
            )}
          </div>
        </div>
      </header>

      {sold && (
        <div className="bg-red-600 py-2.5 text-center text-sm font-semibold text-white">
          Bu araç satılmıştır
        </div>
      )}

      <div className="mx-auto max-w-xl px-4">
        <div className="mt-5">
          <h1 className="text-2xl font-bold text-slate-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          {vehicle.trim && <p className="mt-0.5 text-sm text-slate-500">{vehicle.trim}</p>}
          {vehicle.isNegotiable && !sold && (
            <p className="mt-2">
              <Badge variant="green">Pazarlık payı var</Badge>
            </p>
          )}
        </div>

        <div className={cn(sold && 'pointer-events-none opacity-70')}>
          <div className="mt-4">
            <Gallery photos={vehicle.photos} videos={vehicle.videos} />
          </div>

          <div className="mt-5 grid grid-cols-4 divide-x rounded-xl border border-slate-200 bg-white py-3 text-center">
            <div>
              <p className="text-sm font-bold text-slate-900">{vehicle.year}</p>
              <p className="text-[11px] text-slate-500">Yıl</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{formatKm(vehicle.mileageKm)}</p>
              <p className="text-[11px] text-slate-500">Kilometre</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{fuelLabel}</p>
              <p className="text-[11px] text-slate-500">Yakıt</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{transmissionLabel}</p>
              <p className="text-[11px] text-slate-500">Şanzıman</p>
            </div>
          </div>

          <section className="mt-6">
            <h2 className="text-base font-semibold text-slate-900">Şeffaflık Raporu</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <LightCard
                light={vehicle.lights.paint}
                icon={Paintbrush}
                title="Boya / Değişen"
                verdict={paintVerdict}
              />
              <LightCard
                light={vehicle.lights.tramer}
                icon={FileText}
                title="Tramer"
                verdict={tramerVerdict}
              />
              <LightCard
                light={vehicle.lights.tuvturk}
                icon={ShieldAlert}
                title="TÜVTÜRK"
                verdict={tuvturkVerdict}
              />
              <LightCard
                light={vehicle.lights.tires}
                icon={Snowflake}
                title="Lastikler"
                verdict={tireVerdict}
              />
            </div>

            <details className="mt-3 rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-900">
                Kaporta Detayı
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                <div className="flex justify-center">
                  <CarDiagram panels={vehicle.panels} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {Object.entries(PANEL_STATE_LABELS_TR).map(([state, label]) => (
                    <span key={state} className="flex items-center gap-1.5 text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PANEL_STATE_COLORS[state as keyof typeof PANEL_STATE_COLORS] }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
                {nonOriginalPanels.length > 0 ? (
                  <ul className="space-y-1 text-sm text-slate-600">
                    {nonOriginalPanels.map((p) => (
                      <li key={p.panel} className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: PANEL_STATE_COLORS[p.state] }}
                        />
                        <span className="font-medium">{PANEL_LABELS_TR[p.panel]}</span>
                        <span>{PANEL_STATE_LABELS_TR[p.state]}</span>
                        {p.paintMicrons !== null && <span className="text-xs text-slate-400">({p.paintMicrons} µm)</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-emerald-600">Tüm kaporta parçaları orijinal.</p>
                )}
              </div>
            </details>

            {vehicle.tramerRecords.length > 0 && (
              <details className="mt-3 rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-900">
                  Tramer Kayıtları
                  <ChevronDown className="h-4 w-4" />
                </summary>
                <ul className="space-y-2 border-t border-slate-100 px-4 py-4 text-sm">
                  {vehicle.tramerRecords.map((record, i) => (
                    <li key={i} className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">
                        {record.incidentDate ?? 'Tarih yok'}
                        {record.description ? ` — ${record.description}` : ''}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatPrice(record.amount, vehicle.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {vehicle.mechanicalChecks.length > 0 && (
              <details className="mt-3 rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-900">
                  Mekanik Kontroller
                  <ChevronDown className="h-4 w-4" />
                </summary>
                <ul className="space-y-2 border-t border-slate-100 px-4 py-4 text-sm">
                  {vehicle.mechanicalChecks.map((check, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <span
                        className={cn(
                          'mt-1 h-2 w-2 shrink-0 rounded-full',
                          check.status === 'ok' && 'bg-emerald-500',
                          check.status === 'attention' && 'bg-amber-500',
                          check.status === 'fail' && 'bg-red-500',
                          !['ok', 'attention', 'fail'].includes(check.status) && 'bg-slate-400',
                        )}
                      />
                      <span>
                        <span className="font-medium text-slate-900">{check.category}</span>
                        {check.note ? ` — ${check.note}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {vehicle.documents.length > 0 && (
              <div className="mt-3 space-y-2">
                {vehicle.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4" />
                    {doc.title ?? 'Ekspertiz Raporu'}
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-base font-semibold text-slate-900">Teknik Özellikler</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <spec.icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500">{spec.label}</p>
                    <p className="truncate text-sm font-medium text-slate-900">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {vehicle.tires.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Lastikler</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {vehicle.tires.map((tire) => (
                    <div key={tire.position} className="flex items-center gap-2 text-slate-600">
                      <span
                        className={cn(
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          tire.treadMm === null || tire.treadMm === undefined
                            ? 'bg-slate-300'
                            : tire.treadMm < 2
                              ? 'bg-red-500'
                              : tire.treadMm < 4
                                ? 'bg-amber-500'
                                : 'bg-emerald-500',
                        )}
                      />
                      <span className="capitalize">
                        {tire.position.replace('_', ' ')} ·{' '}
                        {tire.treadMm !== null && tire.treadMm !== undefined ? `${tire.treadMm} mm` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {vehicle.features.length > 0 && (
            <section className="mt-6">
              <h2 className="text-base font-semibold text-slate-900">Özellikler</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {vehicle.features.map((feature) => (
                  <Badge key={feature} className="bg-slate-100 text-slate-700">
                    {feature}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {vehicle.description && (
            <section className="mt-6">
              <h2 className="text-base font-semibold text-slate-900">Açıklama</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {vehicle.description}
              </p>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              {vehicle.dealership.logoUrl ? (
                <img
                  src={vehicle.dealership.logoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold text-white"
                  style={{ backgroundColor: 'var(--brand, #0F172A)' }}
                >
                  {vehicle.dealership.name.charAt(0)}
                </span>
              )}
              <div>
                <p className="font-semibold text-slate-900">{vehicle.dealership.name}</p>
                {(vehicle.dealership.address || vehicle.dealership.district || vehicle.dealership.city) && (
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {[vehicle.dealership.address, vehicle.dealership.district, vehicle.dealership.city]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
            {mapsQuery && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Google Haritalar&apos;da Gör
              </a>
            )}
          </section>

          {sold && similar.length > 0 && (
            <section id="benzer" className="mt-6">
              <h2 className="text-base font-semibold text-slate-900">Benzer Araçlar</h2>
              <div className="mt-3 space-y-3">
                {similar.map((similarVehicle) => (
                  <Link
                    key={similarVehicle.id}
                    href={`/v/${similarVehicle.publicId}`}
                    className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    {similarVehicle.coverMd ? (
                      <img
                        src={similarVehicle.coverMd}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <Car className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {similarVehicle.year} {similarVehicle.make} {similarVehicle.model}
                      </p>
                      <p className="text-sm text-slate-500">{formatKm(similarVehicle.mileageKm)}</p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatPrice(similarVehicle.price, similarVehicle.currency)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {sold ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div
            className="mx-auto max-w-xl px-4 py-3"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <Link
              href="#benzer"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--brand, #0F172A)' }}
            >
              Benzer araçları gör
            </Link>
          </div>
        </div>
      ) : (
        <CtaBar
          publicId={vehicle.publicId}
          vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          vehicleUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/v/${vehicle.publicId}`}
          phone={vehicle.dealership.phone}
          whatsappPhone={vehicle.dealership.whatsappPhone}
          sold={false}
        />
      )}
    </main>
  );
}

function LightCard({
  light,
  icon: Icon,
  title,
  verdict,
}: {
  light: 'green' | 'amber' | 'red' | 'unknown';
  icon: typeof Car;
  title: string;
  verdict: string;
}) {
  const styles = {
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-600' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' },
    unknown: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-500' },
  } as const;
  const classes = styles[light];

  return (
    <div className={cn('rounded-xl border p-3', classes.bg, classes.border)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Icon className={cn('h-3.5 w-3.5', classes.icon)} />
        {title}
      </div>
      <p className={cn('mt-1.5 text-sm font-medium', classes.text)}>{verdict}</p>
    </div>
  );
}

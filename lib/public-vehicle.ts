import 'server-only';
import { cache } from 'react';
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  dealerships,
  mechanicalChecks,
  media,
  tires,
  tramerRecords,
  vehiclePanels,
  vehicles,
} from '@/lib/db/schema';
import { maskVin } from '@/lib/vin';
import { parseVideoUrl } from '@/lib/video';
import { publicMediaUrl } from '@/lib/media-url';
import {
  daysUntil,
  paintLight,
  tireLight,
  tramerLight,
  tuvturkLight,
  worstLight,
  type Light,
  type PanelCode,
  type PanelState,
} from '@/lib/status-rules';

export type PublicPhoto = {
  sm: string;
  md: string;
  lg: string;
};

export type PublicTire = {
  position: string;
  brand: string | null;
  size: string | null;
  season: string | null;
  treadMm: number | null;
  dotYear: number | null;
};

export type PublicDto = {
  id: string;
  dealershipId: string;
  publicId: string;
  status: 'active' | 'reserved' | 'sold';
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileageKm: number;
  bodyType: string | null;
  color: string | null;
  fuel: string;
  transmission: string;
  drivetrain: string | null;
  engineCc: number | null;
  horsepower: number | null;
  torqueNm: number | null;
  batteryKwh: number | null;
  rangeKm: number | null;
  previousOwners: number | null;
  warrantyUntil: string | null;
  price: number | null;
  currency: string;
  priceVisible: boolean;
  isNegotiable: boolean;
  description: string | null;
  features: string[];
  maskedVin: string;
  photos: PublicPhoto[];
  videos: {
    provider: string;
    id?: string;
    embedUrl: string;
    thumbnailUrl?: string;
    title: string | null;
  }[];
  documents: { id: string; title: string | null; url: string; mimeType: string | null }[];
  panels: Record<PanelCode, PanelState>;
  panelList: { panel: PanelCode; state: PanelState; paintMicrons: number | null; note: string | null }[];
  tramerRecords: { incidentDate: string | null; amount: number; description: string | null }[];
  mechanicalChecks: { category: string; status: string; note: string | null }[];
  tires: PublicTire[];
  mainTires: PublicTire[];
  lights: {
    paint: Light;
    tramer: Light;
    tuvturk: Light;
    tires: Light;
    worst: Light;
  };
  tramerTotalAmount: number;
  hasHeavyDamage: boolean;
  tuvturkValidUntil: string | null;
  tuvturkDaysLeft: number | null;
  dealership: {
    name: string;
    logoUrl: string | null;
    brandColor: string | null;
    phone: string;
    whatsappPhone: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
    tramerAmberThreshold: number;
  };
};

const MAIN_TIRE_POSITIONS = ['front_left', 'front_right', 'rear_left', 'rear_right'];

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export const getPublicVehicle = cache(async (publicId: string): Promise<PublicDto | null> => {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.publicId, publicId), ne(vehicles.status, 'draft')))
    .limit(1);
  if (!vehicle) return null;

  const [dealership] = await db
    .select()
    .from(dealerships)
    .where(eq(dealerships.id, vehicle.dealershipId))
    .limit(1);
  if (!dealership) return null;

  const [panelRows, tireRows, tramerRows, checkRows, mediaRows] = await Promise.all([
    db.select().from(vehiclePanels).where(eq(vehiclePanels.vehicleId, vehicle.id)),
    db.select().from(tires).where(eq(tires.vehicleId, vehicle.id)),
    db.select().from(tramerRecords).where(eq(tramerRecords.vehicleId, vehicle.id)).orderBy(desc(tramerRecords.incidentDate)),
    db.select().from(mechanicalChecks).where(eq(mechanicalChecks.vehicleId, vehicle.id)),
    db
      .select()
      .from(media)
      .where(and(eq(media.vehicleId, vehicle.id), eq(media.isPublic, true)))      .orderBy(desc(media.isCover), asc(media.sortOrder)),
  ]);

  const photos = mediaRows
    .filter((m) => m.kind === 'photo')
    .map((m) => ({
      sm: publicMediaUrl(m.variants?.sm ?? m.storagePath ?? ''),
      md: publicMediaUrl(m.variants?.md ?? m.storagePath ?? ''),
      lg: publicMediaUrl(m.variants?.lg ?? m.storagePath ?? ''),
    }));

  const videos = mediaRows
    .filter((m) => m.kind === 'video_link')
    .map((m) => {
      const parsed = parseVideoUrl(m.externalUrl ?? '');
      return {
        provider: parsed.provider,
        id: parsed.id,
        embedUrl: parsed.embedUrl,
        thumbnailUrl: parsed.thumbnailUrl,
        title: m.title,
      };
    });

  const documents = mediaRows
    .filter((m) => m.kind === 'document')
    .map((m) => ({
      id: m.id,
      title: m.title,
      url: publicMediaUrl(m.storagePath ?? ''),
      mimeType: m.mimeType,
    }));

  const panels: Record<PanelCode, PanelState> = {} as Record<PanelCode, PanelState>;
  for (const row of panelRows) {
    panels[row.panel as PanelCode] = row.state;
  }

  const tireRowsByPosition = tireRows.map((t) => ({
    position: t.position,
    brand: t.brand,
    size: t.size,
    season: t.season,
    treadMm: toNumber(t.treadMm),
    dotYear: t.dotYear,
  }));
  const mainTireTreads = tireRowsByPosition
    .filter((t) => MAIN_TIRE_POSITIONS.includes(t.position))
    .map((t) => t.treadMm);

  const tramerTotal = toNumber(vehicle.tramerTotalAmount) ?? 0;
  const amberThreshold = toNumber(dealership.tramerAmberThreshold ?? '20000') ?? 20000;
  const tuvturkDaysLeft = vehicle.tuvturkValidUntil ? daysUntil(vehicle.tuvturkValidUntil) : null;

  const lights = {
    paint: paintLight(panelRows, vehicle.hasHeavyDamage ?? false),
    tramer: tramerLight(tramerTotal, vehicle.hasHeavyDamage ?? false, amberThreshold),
    tuvturk: tuvturkLight(vehicle.tuvturkValidUntil),
    tires: worstLight(mainTireTreads.map((t) => tireLight(t))),
    worst: worstLight([
      paintLight(panelRows, vehicle.hasHeavyDamage ?? false),
      tramerLight(tramerTotal, vehicle.hasHeavyDamage ?? false, amberThreshold),
      tuvturkLight(vehicle.tuvturkValidUntil),
      worstLight(mainTireTreads.map((t) => tireLight(t))),
    ]),
  };

  return {
    id: vehicle.id,
    dealershipId: vehicle.dealershipId,
    publicId: vehicle.publicId,
    status: vehicle.status as 'active' | 'reserved' | 'sold',
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    year: vehicle.year,
    mileageKm: vehicle.mileageKm,
    bodyType: vehicle.bodyType,
    color: vehicle.color,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    engineCc: vehicle.engineCc,
    horsepower: vehicle.horsepower,
    torqueNm: vehicle.torqueNm,
    batteryKwh: toNumber(vehicle.batteryKwh),
    rangeKm: vehicle.rangeKm,
    previousOwners: vehicle.previousOwners,
    warrantyUntil: vehicle.warrantyUntil,
    price: toNumber(vehicle.price),
    currency: vehicle.currency ?? 'TRY',
    priceVisible: vehicle.priceVisible ?? true,
    isNegotiable: vehicle.isNegotiable ?? false,
    description: vehicle.description,
    features: vehicle.features ?? [],
    maskedVin: maskVin(vehicle.vin),
    photos,
    videos,
    documents,
    panels,
    panelList: panelRows.map((p) => ({
      panel: p.panel as PanelCode,
      state: p.state,
      paintMicrons: toNumber(p.paintMicrons),
      note: p.note,
    })),
    tramerRecords: tramerRows.map((r) => ({
      incidentDate: r.incidentDate,
      amount: toNumber(r.amount) ?? 0,
      description: r.description,
    })),
    mechanicalChecks: checkRows.map((c) => ({
      category: c.category,
      status: c.status,
      note: c.note,
    })),
    tires: tireRowsByPosition,
    mainTires: tireRowsByPosition.filter((t) => MAIN_TIRE_POSITIONS.includes(t.position)),
    lights,
    tramerTotalAmount: tramerTotal,
    hasHeavyDamage: vehicle.hasHeavyDamage ?? false,
    tuvturkValidUntil: vehicle.tuvturkValidUntil,
    tuvturkDaysLeft: tuvturkDaysLeft,
    dealership: {
      name: dealership.name,
      logoUrl: dealership.logoUrl,
      brandColor: dealership.brandColor,
      phone: dealership.phone,
      whatsappPhone: dealership.whatsappPhone,
      address: dealership.address,
      city: dealership.city,
      district: dealership.district,
      tramerAmberThreshold: amberThreshold,
    },
  };
});

export type SimilarVehicle = {
  id: string;
  publicId: string;
  make: string;
  model: string;
  year: number;
  price: number | null;
  currency: string;
  mileageKm: number;
  coverMd: string | null;
};

export const getSimilarVehicles = cache(
  async (dealershipId: string, excludeId: string, limit = 4): Promise<SimilarVehicle[]> => {
    const rows = await db
      .select({
        id: vehicles.id,
        publicId: vehicles.publicId,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        price: vehicles.price,
        currency: vehicles.currency,
        mileageKm: vehicles.mileageKm,
      })
      .from(vehicles)
      .where(
        and(eq(vehicles.dealershipId, dealershipId), eq(vehicles.status, 'active'), ne(vehicles.id, excludeId)),
      )
      .orderBy(desc(vehicles.publishedAt))
      .limit(limit);
    if (rows.length === 0) return [];

    const covers = await db
      .select({
        vehicleId: media.vehicleId,
        md: media.variants,
        storagePath: media.storagePath,
        isCover: media.isCover,
        sortOrder: media.sortOrder,
      })
      .from(media)
      .where(and(eq(media.kind, 'photo'), eq(media.isPublic, true), inArray(media.vehicleId, rows.map((r) => r.id))))
      .orderBy(desc(media.isCover), asc(media.sortOrder));

    const bestCover = new Map<string, string>();
    for (const c of covers) {
      if (bestCover.has(c.vehicleId)) continue;
      if (c.vehicleId && [...rows.map((r) => r.id)].includes(c.vehicleId)) {
        bestCover.set(c.vehicleId, publicMediaUrl(c.md?.md ?? c.storagePath ?? ''));
      }
    }

    return rows.map((r) => ({
      id: r.id,
      publicId: r.publicId,
      make: r.make,
      model: r.model,
      year: r.year,
      price: r.price !== null ? Number(r.price) : null,
      currency: r.currency ?? 'TRY',
      mileageKm: r.mileageKm,
      coverMd: bestCover.get(r.id) ?? null,
    }));
  },
);

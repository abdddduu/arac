import 'server-only';
import sharp from 'sharp';
import { qrPngDataUrl, vehiclePublicUrl } from '@/lib/qr';
import type { StickerDealership, StickerFormat, StickerVehicle } from './sticker-doc';

export type { StickerDealership, StickerFormat, StickerVehicle };
export { renderStickersPdf, StickerDocument, StickerPage } from './sticker-doc';

export const STICKER_FORMATS: StickerFormat[] = ['a4', 'a5', '10x15'];

export function isStickerFormat(value: string | null): value is StickerFormat {
  return value === 'a4' || value === 'a5' || value === '10x15';
}

export async function loadLogo(logoUrl: string | null): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await response.arrayBuffer());
    if (contentType.includes('png') || contentType.includes('jpeg')) return buffer;
    return await sharp(buffer).png().toBuffer();
  } catch {
    return null;
  }
}

export function toStickerVehicle(input: {
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileageKm: number;
  fuel: string;
  transmission: string;
  horsepower: number | null;
  price: string | null;
  currency: string | null;
  priceVisible: boolean;
  publicId: string;
}): StickerVehicle {
  return {
    make: input.make,
    model: input.model,
    trim: input.trim,
    year: input.year,
    mileageKm: input.mileageKm,
    fuel: input.fuel,
    transmission: input.transmission,
    horsepower: input.horsepower,
    price: input.price === null ? null : Number(input.price),
    currency: input.currency ?? 'TRY',
    priceVisible: input.priceVisible,
    publicId: input.publicId,
  };
}

export async function buildStickerItem(
  input: {
    make: string;
    model: string;
    trim: string | null;
    year: number;
    mileageKm: number;
    fuel: string;
    transmission: string;
    horsepower: number | null;
    price: string | null;
    currency: string | null;
    priceVisible: boolean;
    publicId: string;
  },
  dealership: {
    name: string;
    phone: string;
    logoUrl: string | null;
    brandColor: string | null;
  },
) {
  const vehicle = toStickerVehicle(input);
  const qrDataUrl = await qrPngDataUrl(vehiclePublicUrl(vehicle.publicId, 'qr'));
  return {
    vehicle,
    dealership: {
      name: dealership.name,
      phone: dealership.phone,
      logo: await loadLogo(dealership.logoUrl),
      brandColor: dealership.brandColor ?? '#0F172A',
    },
    qrDataUrl,
  };
}

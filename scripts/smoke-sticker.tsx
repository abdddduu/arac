import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

async function main() {
  const { renderStickersPdf } = await import('../lib/pdf/sticker-doc');

  const vehicle = {
    make: 'Volkswagen',
    model: 'Passat',
    trim: 'Değişen Şasi İğne Ölçüm',
    year: 2021,
    mileageKm: 84500,
    fuel: 'Dizel',
    transmission: 'Otomatik',
    horsepower: 120,
    price: 1450000,
    currency: 'TRY',
    priceVisible: true,
    publicId: 'abc123xyz',
  };
  const dealership = {
    name: 'Örnek Oto Galeri',
    phone: '+90 532 123 45 67',
    logo: null,
    brandColor: '#0F172A',
  };
  const qrDataUrl = await QRCode.toDataURL('https://example.com/v/abc123xyz', {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 600,
  });

  mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });

  for (const format of ['a4', 'a5', '10x15'] as const) {
    const buffer = await renderStickersPdf(
      [{ vehicle: { ...vehicle, publicId: `${vehicle.publicId}-${format}` }, dealership, qrDataUrl }],
      format,
    );
    const file = path.join(process.cwd(), 'tmp', `sticker-${format}.pdf`);
    writeFileSync(file, buffer);
    console.log(`${format}: ${buffer.length} bytes`);
    if (buffer.length <= 10240) {
      throw new Error(`sticker-${format}.pdf too small: ${buffer.length}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

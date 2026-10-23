import 'server-only';
import QRCode from 'qrcode';
import { appUrl } from '@/lib/env';

export function vehiclePublicUrl(publicId: string, source: string = 'qr') {
  return `${appUrl()}/v/${publicId}?s=${encodeURIComponent(source)}`;
}

export async function qrSvg(text: string) {
  return QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'H', margin: 1 });
}

export async function qrPngDataUrl(text: string, width = 1024) {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'H', margin: 1, width });
}

export async function qrPngBuffer(text: string, width = 1024) {
  return QRCode.toBuffer(text, { type: 'png', errorCorrectionLevel: 'H', margin: 1, width });
}

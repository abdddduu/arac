import path from 'node:path';
import React from 'react';
import {
  Document,
  Font,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';

export type StickerVehicle = {
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileageKm: number;
  fuel: string;
  transmission: string;
  horsepower: number | null;
  price: number | null;
  currency: string;
  priceVisible: boolean;
  publicId: string;
};

export type StickerDealership = {
  name: string;
  phone: string;
  logo: Buffer | null;
  brandColor: string;
};

export type StickerFormat = 'a4' | 'a5' | '10x15';

const registerFonts = () => {
  if (Font.getRegisteredFontFamilies().includes('DejaVu')) return;
  Font.register({
    family: 'DejaVu',
    fonts: [
      { src: path.join(process.cwd(), 'assets/fonts/DejaVuSans.ttf') },
      { src: path.join(process.cwd(), 'assets/fonts/DejaVuSans-Bold.ttf'), fontWeight: 'bold' },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
};

registerFonts();

const PAGE_SIZES: Record<StickerFormat, [number, number]> = {
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  '10x15': [283.46, 425.2],
};

function scaleFor(format: StickerFormat): number {
  if (format === 'a4') return 1;
  if (format === 'a5') return 0.8;
  return 0.62;
}

export function StickerPage({
  vehicle,
  dealership,
  qrDataUrl,
  format,
}: {
  vehicle: StickerVehicle;
  dealership: StickerDealership;
  qrDataUrl: string;
  format: StickerFormat;
}) {
  const s = scaleFor(format);
  const styles = StyleSheet.create({
    page: {
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      fontFamily: 'DejaVu',
      flexDirection: 'column',
      alignItems: 'center',
      padding: `${16 * s}pt`,
    },
    topBand: {
      width: '100%',
      backgroundColor: dealership.brandColor || '#0F172A',
      borderRadius: `${8 * s}pt`,
      padding: `${10 * s}pt ${12 * s}pt`,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    logo: {
      maxWidth: `${36 * s}pt`,
      maxHeight: `${28 * s}pt`,
    },
    dealerName: {
      color: '#ffffff',
      fontSize: `${12 * s}pt`,
      fontWeight: 'bold',
      textAlign: 'right',
    },
    break: { height: `${10 * s}pt` },
    title: {
      fontSize: `${24 * s}pt`,
      fontWeight: 'bold',
      color: '#0f172a',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: `${12 * s}pt`,
      color: '#64748b',
      textAlign: 'center',
      marginTop: `${2 * s}pt`,
    },
    specsRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: `${10 * s}pt`,
    },
    specBox: {
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: `${6 * s}pt`,
      padding: `${6 * s}pt ${10 * s}pt`,
      marginHorizontal: `${3 * s}pt`,
      alignItems: 'center',
    },
    specValue: {
      fontSize: `${11 * s}pt`,
      fontWeight: 'bold',
      color: '#0f172a',
    },
    specLabel: {
      fontSize: `${7 * s}pt`,
      color: '#64748b',
      marginTop: `${1 * s}pt`,
    },
    price: {
      fontSize: `${26 * s}pt`,
      fontWeight: 'bold',
      color: dealership.brandColor || '#0F172A',
      marginTop: `${10 * s}pt`,
    },
    qrWrap: {
      marginTop: `${10 * s}pt`,
      backgroundColor: '#ffffff',
      padding: `${6 * s}pt`,
      borderRadius: `${6 * s}pt`,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    qr: {
      width: `${300 * s}pt`,
      height: `${300 * s}pt`,
    },
    cta: {
      fontSize: `${10 * s}pt`,
      color: '#0f172a',
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: `${6 * s}pt`,
    },
    ctaEn: {
      fontSize: `${8 * s}pt`,
      color: '#64748b',
      textAlign: 'center',
      marginTop: `${2 * s}pt`,
    },
    nfc: {
      fontSize: `${8 * s}pt`,
      color: '#334155',
      textAlign: 'center',
      marginTop: `${6 * s}pt`,
    },
    url: {
      fontSize: `${9 * s}pt`,
      fontWeight: 'bold',
      color: '#0f172a',
      textAlign: 'center',
      marginTop: `${3 * s}pt`,
    },
    footer: {
      position: 'absolute',
      bottom: `${12 * s}pt`,
      left: 0,
      right: 0,
      fontSize: `${9 * s}pt`,
      color: '#64748b',
      textAlign: 'center',
    },
  });

  const priceLabel =
    vehicle.priceVisible && vehicle.price !== null
      ? new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: vehicle.currency || 'TRY',
          maximumFractionDigits: 0,
        }).format(vehicle.price)
      : null;

  const specs = [
    { value: `${new Intl.NumberFormat('tr-TR').format(vehicle.mileageKm)} km`, label: 'Kilometre' },
    { value: vehicle.fuel, label: 'Yakıt' },
    { value: vehicle.transmission, label: 'Şanzıman' },
    ...(vehicle.horsepower ? [{ value: `${vehicle.horsepower} HP`, label: 'Güç' }] : []),
  ];

  return (
    <Page size={PAGE_SIZES[format]} orientation="portrait" style={styles.page}>
      <View style={styles.topBand}>
        {dealership.logo ? <PdfImage src={dealership.logo} style={styles.logo} /> : null}
        <Text style={styles.dealerName}>{dealership.name}</Text>
      </View>
      <View style={styles.break} />
      <Text style={styles.title}>
        {vehicle.make} {vehicle.model}
      </Text>
      {vehicle.trim ? (
        <Text style={styles.subtitle}>
          {vehicle.trim} · {vehicle.year}
        </Text>
      ) : (
        <Text style={styles.subtitle}>{vehicle.year}</Text>
      )}
      <View style={styles.specsRow}>
        {specs.map((spec) => (
          <View key={spec.label} style={styles.specBox}>
            <Text style={styles.specValue}>{spec.value}</Text>
            <Text style={styles.specLabel}>{spec.label}</Text>
          </View>
        ))}
      </View>
      {priceLabel ? <Text style={styles.price}>{priceLabel}</Text> : null}
      <View style={styles.qrWrap}>
        <PdfImage src={qrDataUrl} style={styles.qr} />
      </View>
      <Text style={styles.cta}>Aracın tüm geçmişini görmek için okutun</Text>
      <Text style={styles.ctaEn}>Scan for full vehicle history</Text>
      <Text style={styles.nfc}>NFC: Telefonunuzu dokundurun</Text>
      <Text style={styles.url}>/{vehicle.publicId}</Text>
      <Text style={styles.footer}>{dealership.phone}</Text>
    </Page>
  );
}

export function StickerDocument({
  items,
  format,
}: {
  items: { vehicle: StickerVehicle; dealership: StickerDealership; qrDataUrl: string }[];
  format: StickerFormat;
}) {
  return (
    <Document>
      {items.map((item) => (
        <StickerPage key={item.vehicle.publicId} {...item} format={format} />
      ))}
    </Document>
  );
}

export async function renderStickersPdf(
  items: { vehicle: StickerVehicle; dealership: StickerDealership; qrDataUrl: string }[],
  format: StickerFormat,
) {
  return renderToBuffer(<StickerDocument items={items} format={format} />);
}

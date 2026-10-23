export type Light = 'green' | 'amber' | 'red' | 'unknown';

export type PanelState = 'original' | 'local_paint' | 'painted' | 'replaced' | 'plastic_repair';
export type FuelType = 'gasoline' | 'diesel' | 'lpg' | 'hybrid' | 'plugin_hybrid' | 'electric';
export type Transmission = 'manual' | 'automatic' | 'semi_automatic' | 'cvt' | 'dct';
export type Drivetrain = 'fwd' | 'rwd' | 'awd' | '4wd';
export type VehicleStatus = 'draft' | 'active' | 'reserved' | 'sold';

export function paintLight(panels: { state: PanelState }[], hasHeavyDamage: boolean): Light {
  if (hasHeavyDamage) return 'red';
  if (panels.some((p) => p.state === 'replaced')) return 'red';
  if (panels.some((p) => ['local_paint', 'painted', 'plastic_repair'].includes(p.state))) {
    return 'amber';
  }
  return 'green';
}

export function tramerLight(
  total: number,
  hasHeavyDamage: boolean,
  amberThreshold = 20000,
): Light {
  if (hasHeavyDamage) return 'red';
  if (total > amberThreshold) return 'red';
  if (total > 0) return 'amber';
  return 'green';
}

export function daysUntil(date: Date | string, now = new Date()) {
  const target = typeof date === 'string' ? new Date(date) : date;
  const msPerDay = 86_400_000;
  return Math.ceil((target.getTime() - now.getTime()) / msPerDay);
}

export function tuvturkLight(validUntil: Date | string | null, now = new Date()): Light {
  if (!validUntil) return 'unknown';
  const days = daysUntil(validUntil, now);
  if (days < 0) return 'red';
  if (days <= 90) return 'amber';
  return 'green';
}

export function tireLight(treadMm: number | null): Light {
  if (treadMm === null || treadMm === undefined) return 'unknown';
  if (treadMm < 2) return 'red';
  if (treadMm < 4) return 'amber';
  return 'green';
}

const LIGHT_ORDER: Light[] = ['unknown', 'green', 'amber', 'red'];

export function worstLight(lights: Light[]): Light {
  let worst: Light = 'unknown';
  for (const light of lights) {
    if (LIGHT_ORDER.indexOf(light) > LIGHT_ORDER.indexOf(worst)) {
      worst = light;
    }
  }
  return worst;
}

export const PANEL_CODES = [
  'hood',
  'roof',
  'trunk',
  'front_bumper',
  'rear_bumper',
  'front_left_fender',
  'front_right_fender',
  'rear_left_fender',
  'rear_right_fender',
  'front_left_door',
  'front_right_door',
  'rear_left_door',
  'rear_right_door',
] as const;

export type PanelCode = (typeof PANEL_CODES)[number];

export const PANEL_LABELS_TR: Record<PanelCode, string> = {
  hood: 'Kaput',
  roof: 'Tavan',
  trunk: 'Bagaj',
  front_bumper: 'Ön Tampon',
  rear_bumper: 'Arka Tampon',
  front_left_fender: 'Sol Ön Çamurluk',
  front_right_fender: 'Sağ Ön Çamurluk',
  rear_left_fender: 'Sol Arka Çamurluk',
  rear_right_fender: 'Sağ Arka Çamurluk',
  front_left_door: 'Sol Ön Kapı',
  front_right_door: 'Sağ Ön Kapı',
  rear_left_door: 'Sol Arka Kapı',
  rear_right_door: 'Sağ Arka Kapı',
};

export const PANEL_STATE_LABELS_TR: Record<PanelState, string> = {
  original: 'Orijinal',
  local_paint: 'Lokal Boyalı',
  painted: 'Boyalı',
  replaced: 'Değişen',
  plastic_repair: 'Plastik/Macun',
};

export const PANEL_STATE_COLORS: Record<PanelState, string> = {
  original: '#22c55e',
  local_paint: '#facc15',
  painted: '#f97316',
  replaced: '#ef4444',
  plastic_repair: '#a855f7',
};

export const FUEL_LABELS_TR: Record<FuelType, string> = {
  gasoline: 'Benzin',
  diesel: 'Dizel',
  lpg: 'LPG',
  hybrid: 'Hibrit',
  plugin_hybrid: 'Plug-in Hibrit',
  electric: 'Elektrik',
};

export const TRANSMISSION_LABELS_TR: Record<Transmission, string> = {
  manual: 'Manuel',
  automatic: 'Otomatik',
  semi_automatic: 'Yarı Otomatik',
  cvt: 'CVT',
  dct: 'Çift Kavrama (DCT)',
};

export const DRIVETRAIN_LABELS_TR: Record<Drivetrain, string> = {
  fwd: 'Önden Çekiş',
  rwd: 'Arkadan İtiş',
  awd: 'AWD',
  '4wd': '4x4',
};

export const STATUS_LABELS_TR: Record<VehicleStatus, string> = {
  draft: 'Taslak',
  active: 'Satışta',
  reserved: 'Rezerve',
  sold: 'Satıldı',
};

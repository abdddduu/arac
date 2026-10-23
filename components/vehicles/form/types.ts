import { z } from 'zod';
import {
  conditionSchema,
  vehicleBasicSchema,
  vehicleEngineSchema,
} from '@/lib/validation/vehicle';

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type VehicleBasicValues = z.output<typeof vehicleBasicSchema>;
export type VehicleEngineValues = z.output<typeof vehicleEngineSchema>;
export type ConditionValues = z.output<typeof conditionSchema>;

export const COMMON_FEATURES = [
  'Sunroof',
  'Cam Tavan',
  'Geri Görüş Kamerası',
  'Navigasyon',
  'Deri Koltuk',
  'Isıtmalı Koltuk',
  'Adaptif Cruise Control',
  'Şerit Takip',
  'Kör Nokta Uyarı',
  'Apple CarPlay',
  'Android Auto',
  'Anahtarsız Giriş',
  'LED Far',
  'Park Sensörü',
];

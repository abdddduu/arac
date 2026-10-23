import { z } from 'zod';
import { isValidVin } from '@/lib/vin';

const currentYear = new Date().getFullYear();

const toUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const optionalNumber = () =>
  z.preprocess(toUndefined, z.coerce.number().optional());

const optionalNonNegative = () =>
  z.preprocess(toUndefined, z.coerce.number().nonnegative().optional());

const optionalInt = () => z.preprocess(toUndefined, z.coerce.number().int().optional());

export const vehicleBasicSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  year: z.coerce.number().int().min(1950).max(currentYear + 1),
  vin: z
    .string()
    .transform((v) => v.toUpperCase())
    .refine(isValidVin),
  plate: z.string().optional(),
  mileageKm: z.coerce.number().int().nonnegative(),
  bodyType: z.string().optional(),
  color: z.string().optional(),
  price: optionalNonNegative(),
  currency: z.string().default('TRY'),
  priceVisible: z.boolean(),
  isNegotiable: z.boolean(),
  description: z.string().optional(),
  features: z.array(z.string()).default([]),
});

const fuelEnum = z.enum(['gasoline', 'diesel', 'lpg', 'hybrid', 'plugin_hybrid', 'electric']);
const transmissionEnum = z.enum(['manual', 'automatic', 'semi_automatic', 'cvt', 'dct']);
const drivetrainEnum = z.enum(['fwd', 'rwd', 'awd', '4wd']);

const optionalDate = () => z.preprocess(toUndefined, z.string().date().optional());

export const vehicleEngineSchema = z.object({
  fuel: fuelEnum,
  transmission: transmissionEnum,
  drivetrain: drivetrainEnum.optional(),
  engineCc: optionalInt(),
  horsepower: optionalInt(),
  torqueNm: optionalInt(),
  batteryKwh: optionalNumber(),
  rangeKm: optionalInt(),
  previousOwners: optionalInt(),
  warrantyUntil: optionalDate(),
});

const panelEnum = z.enum([
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
]);
const panelStateEnum = z.enum(['original', 'local_paint', 'painted', 'replaced', 'plastic_repair']);

export const conditionSchema = z.object({
  panels: z
    .array(
      z.object({
        panel: panelEnum,
        state: panelStateEnum,
        paintMicrons: z.preprocess(toUndefined, z.coerce.number().int().min(0).optional()),
        note: z.string().optional(),
      }),
    )
    .default([]),
  tramerRecords: z
    .array(
      z.object({
        incidentDate: optionalDate(),
        amount: z.preprocess(toUndefined, z.coerce.number().nonnegative()),
        description: z.string().optional(),
      }),
    )
    .default([]),
  hasHeavyDamage: z.boolean(),
  tuvturkValidUntil: optionalDate(),
  tires: z
    .array(
      z.object({
        position: z.enum(['FL', 'FR', 'RL', 'RR', 'SPARE']),
        brand: z.string().optional(),
        size: z.string().optional(),
        season: z.string().optional(),
        treadMm: z.preprocess(toUndefined, z.coerce.number().min(0).max(15).optional()),
        dotYear: optionalInt(),
      }),
    )
    .default([]),
  mechanicalChecks: z
    .array(
      z.object({
        category: z.string().min(1),
        status: z.enum(['ok', 'attention', 'fault']),
        note: z.string().optional(),
      }),
    )
    .default([]),
});

export const vehicleFormSchema = vehicleBasicSchema
  .merge(vehicleEngineSchema)
  .merge(conditionSchema);

import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const vehicleStatus = pgEnum('vehicle_status', ['draft', 'active', 'reserved', 'sold']);

export const fuelType = pgEnum('fuel_type', [
  'gasoline',
  'diesel',
  'lpg',
  'hybrid',
  'plugin_hybrid',
  'electric',
]);

export const transmission = pgEnum('transmission', [
  'manual',
  'automatic',
  'semi_automatic',
  'cvt',
  'dct',
]);

export const drivetrain = pgEnum('drivetrain', ['fwd', 'rwd', 'awd', '4wd']);

export const panelCode = pgEnum('panel_code', [
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

export const panelState = pgEnum('panel_state', [
  'original',
  'local_paint',
  'painted',
  'replaced',
  'plastic_repair',
]);

export const mediaKind = pgEnum('media_kind', ['photo', 'video_link', 'document']);

export const dealerships = pgTable('dealerships', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  taxNumber: text('tax_number'),
  logoUrl: text('logo_url'),
  brandColor: text('brand_color').default('#0F172A'),
  phone: text('phone').notNull(),
  whatsappPhone: text('whatsapp_phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  district: text('district'),
  geoLat: numeric('geo_lat', { precision: 9, scale: 6 }),
  geoLng: numeric('geo_lng', { precision: 9, scale: 6 }),
  workingHours: jsonb('working_hours'),
  tramerAmberThreshold: numeric('tramer_amber_threshold', { precision: 12, scale: 2 }).default(
    '20000',
  ),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  dealershipId: uuid('dealership_id')
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('sales'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealershipId: uuid('dealership_id')
      .notNull()
      .references(() => dealerships.id, { onDelete: 'cascade' }),
    publicId: text('public_id').unique().notNull(),
    status: vehicleStatus('status').notNull().default('draft'),
    make: text('make').notNull(),
    model: text('model').notNull(),
    trim: text('trim'),
    year: smallint('year').notNull(),
    vin: varchar('vin', { length: 17 }).notNull(),
    plate: text('plate'),
    mileageKm: integer('mileage_km').notNull(),
    bodyType: text('body_type'),
    color: text('color'),
    fuel: fuelType('fuel').notNull(),
    transmission: transmission('transmission').notNull(),
    drivetrain: drivetrain('drivetrain'),
    engineCc: integer('engine_cc'),
    horsepower: integer('horsepower'),
    torqueNm: integer('torque_nm'),
    batteryKwh: numeric('battery_kwh', { precision: 5, scale: 1 }),
    rangeKm: integer('range_km'),
    previousOwners: smallint('previous_owners'),
    warrantyUntil: date('warranty_until'),
    price: numeric('price', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('TRY'),
    priceVisible: boolean('price_visible').default(true),
    isNegotiable: boolean('is_negotiable').default(false),
    description: text('description'),
    features: text('features').array().default(sql`'{}'::text[]`),
    tuvturkValidUntil: date('tuvturk_valid_until'),
    tramerTotalAmount: numeric('tramer_total_amount', { precision: 12, scale: 2 }).default('0'),
    hasHeavyDamage: boolean('has_heavy_damage').default(false),
    viewCount: integer('view_count').default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    soldAt: timestamp('sold_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('vehicles_dealership_id_vin_unique').on(table.dealershipId, table.vin),
    index('vehicles_dealership_id_status_idx').on(table.dealershipId, table.status),
  ],
);

export const vehiclePanels = pgTable(
  'vehicle_panels',
  {
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    panel: panelCode('panel').notNull(),
    state: panelState('state').notNull().default('original'),
    paintMicrons: integer('paint_microns'),
    note: text('note'),
  },
  (table) => [primaryKey({ columns: [table.vehicleId, table.panel] })],
);

export const tramerRecords = pgTable('tramer_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  incidentDate: date('incident_date'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const tires = pgTable(
  'tires',
  {
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    position: text('position').notNull(),
    brand: text('brand'),
    size: text('size'),
    season: text('season'),
    treadMm: numeric('tread_mm', { precision: 3, scale: 1 }),
    dotYear: smallint('dot_year'),
  },
  (table) => [primaryKey({ columns: [table.vehicleId, table.position] })],
);

export const mechanicalChecks = pgTable('mechanical_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  status: text('status').notNull(),
  note: text('note'),
});

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    dealershipId: uuid('dealership_id')
      .notNull()
      .references(() => dealerships.id, { onDelete: 'cascade' }),
    kind: mediaKind('kind').notNull(),
    category: text('category'),
    storagePath: text('storage_path'),
    variants: jsonb('variants').$type<{ sm?: string; md?: string; lg?: string }>(),
    externalUrl: text('external_url'),
    provider: text('provider'),
    title: text('title'),
    mimeType: text('mime_type'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    width: integer('width'),
    height: integer('height'),
    sortOrder: integer('sort_order').default(0),
    isCover: boolean('is_cover').default(false),
    isPublic: boolean('is_public').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('media_vehicle_id_kind_sort_order_idx').on(table.vehicleId, table.kind, table.sortOrder)],
);

export const vehicleTags = pgTable('vehicle_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  nfcUid: text('nfc_uid').unique(),
  token: text('token').unique().notNull(),
  isActive: boolean('is_active').default(true),
  writtenAt: timestamp('written_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const scanEvents = pgTable(
  'scan_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').references(() => vehicleTags.id, { onDelete: 'set null' }),
    source: text('source'),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
    referrer: text('referrer'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('scan_events_vehicle_id_created_at_idx').on(table.vehicleId, table.createdAt)],
);

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  dealershipId: uuid('dealership_id').notNull().references(() => dealerships.id),
  type: text('type'),
  name: text('name'),
  phone: text('phone'),
  preferredAt: timestamp('preferred_at', { withTimezone: true }),
  note: text('note'),
  status: text('status').default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  dealership: one(dealerships, {
    fields: [vehicles.dealershipId],
    references: [dealerships.id],
  }),
  panels: many(vehiclePanels),
  tires: many(tires),
  tramerRecords: many(tramerRecords),
  mechanicalChecks: many(mechanicalChecks),
  media: many(media),
  tags: many(vehicleTags),
}));

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Media = typeof media.$inferSelect;
export type Dealership = typeof dealerships.$inferSelect;
export type User = typeof users.$inferSelect;
export type VehiclePanel = typeof vehiclePanels.$inferSelect;
export type Tire = typeof tires.$inferSelect;
export type TramerRecord = typeof tramerRecords.$inferSelect;
export type MechanicalCheck = typeof mechanicalChecks.$inferSelect;
export type VehicleTag = typeof vehicleTags.$inferSelect;
export type Lead = typeof leads.$inferSelect;

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { mediaBucket } from '@/lib/env';
import { users } from '@/lib/db/schema';
import { dealerships } from '@/lib/db/schema';
import { publicMediaUrl } from '@/lib/media-url';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function saveDealership(formData: FormData) {
  const { profile } = await requireRole(['owner', 'manager']);

  const str = (key: string) => String(formData.get(key) ?? '');
  const thresholdRaw = str('tramerAmberThreshold');
  const threshold = thresholdRaw === '' ? null : Number(thresholdRaw);

  await db
    .update(dealerships)
    .set({
      name: str('name'),
      legalName: str('legalName') || null,
      taxNumber: str('taxNumber') || null,
      phone: str('phone'),
      whatsappPhone: str('whatsappPhone') || null,
      email: str('email') || null,
      address: str('address') || null,
      city: str('city') || null,
      district: str('district') || null,
      brandColor: str('brandColor') || '#0F172A',
      tramerAmberThreshold: Number.isNaN(threshold) ? null : String(threshold),
      workingHours: JSON.stringify({ text: str('workingHours') }),
    })
    .where(eq(dealerships.id, profile.dealershipId));

  revalidatePath('/dashboard/settings');
}

export type LogoUploadResult = { error: string } | { path: string; token: string };

export async function createLogoUploadUrl(fileName: string): Promise<LogoUploadResult> {
  const { profile } = await requireRole(['owner', 'manager']);

  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'png';
  const path = `${profile.dealershipId}/branding/logo-${Date.now()}.${ext}`;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(mediaBucket())
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { error: 'Logo yükleme bağlantısı oluşturulamadı.' };
  }

  return { path: data.path, token: data.token };
}

export async function saveLogo(path: string) {
  const { profile } = await requireRole(['owner', 'manager']);

  await db
    .update(dealerships)
    .set({ logoUrl: publicMediaUrl(path) })
    .where(eq(dealerships.id, profile.dealershipId));

  revalidatePath('/dashboard/settings');
}

const addStaffSchema = z.object({
  fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalı'),
  email: z.string().email('Geçersiz e-posta adresi'),
  phone: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.string().optional(),
  ),
  role: z.enum(['manager', 'sales']),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
});

export type AddStaffState = {
  error?: string;
};

export async function addStaff(prevState: AddStaffState, formData: FormData): Promise<AddStaffState> {
  const { profile } = await requireRole(['owner']);

  const parsed = addStaffSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    role: formData.get('role'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Form bilgileri geçersiz.' };
  }

  const { fullName, email, phone, role, password } = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return { error: 'Personel oluşturulamadı. E-posta adresi zaten kayıtlı olabilir.' };
  }

  try {
    await db.insert(users).values({
      id: authData.user.id,
      dealershipId: profile.dealershipId,
      fullName,
      phone: phone ?? null,
      role,
    });
  } catch {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: 'Personel kaydedilirken bir sorun oluştu.' };
  }

  revalidatePath('/dashboard/settings');
  return {};
}

export async function toggleStaffActive(userId: string, isActive: boolean) {
  const { profile } = await requireRole(['owner']);

  await db
    .update(users)
    .set({ isActive })
    .where(and(eq(users.id, userId), eq(users.dealershipId, profile.dealershipId)));

  revalidatePath('/dashboard/settings');
}

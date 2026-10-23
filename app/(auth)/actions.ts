'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/db/client';
import { dealerships, users } from '@/lib/db/schema';
import { newSlugSuffix, slugify } from '@/lib/slug';

export type AuthFormState = {
  error?: string;
};

export async function login(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const nextRaw = formData.get('next');
  const next =
    typeof nextRaw === 'string' && nextRaw.startsWith('/') && !nextRaw.startsWith('//')
      ? nextRaw
      : '/dashboard';

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: 'E-posta veya şifre hatalı.' };
  }

  redirect(next);
}

const signupSchema = z.object({
  dealershipName: z.string().min(2, 'Bayi adı en az 2 karakter olmalı'),
  phone: z.string().min(7, 'Telefon numarası geçersiz'),
  whatsappPhone: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.string().min(7, 'WhatsApp numarası geçersiz').optional(),
  ),
  city: z.string().min(1, 'Şehir zorunlu'),
  fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalı'),
  email: z.string().email('Geçersiz e-posta adresi'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
});

export async function signup(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    dealershipName: formData.get('dealershipName'),
    phone: formData.get('phone'),
    whatsappPhone: formData.get('whatsappPhone'),
    city: formData.get('city'),
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Form bilgileri geçersiz.' };
  }

  const { dealershipName, phone, whatsappPhone, city, fullName, email, password } = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    console.error('[signup] auth.createUser failed:', authError?.message);
    return { error: 'Hesap oluşturulamadı. E-posta adresi zaten kayıtlı olabilir.' };
  }

  try {
    await db.transaction(async (tx) => {
      const baseSlug = slugify(dealershipName) || 'bayi';
      let slug = baseSlug;
      for (let i = 0; i < 8; i++) {
        const [existing] = await tx
          .select({ id: dealerships.id })
          .from(dealerships)
          .where(eq(dealerships.slug, slug))
          .limit(1);
        if (!existing) break;
        slug = `${baseSlug}-${newSlugSuffix()}`;
      }

      const [dealership] = await tx
        .insert(dealerships)
        .values({
          slug,
          name: dealershipName,
          phone,
          whatsappPhone: whatsappPhone ?? null,
          city,
        })
        .returning({ id: dealerships.id });

      await tx.insert(users).values({
        id: authData.user.id,
        dealershipId: dealership.id,
        fullName,
        phone: phone ?? null,
        role: 'owner',
      });
    });
  } catch (err) {
    console.error('[signup] database transaction failed:', err);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: 'Kayıt sırasında bir sorun oluştu. Lütfen tekrar deneyin.' };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword({ email, password });

  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

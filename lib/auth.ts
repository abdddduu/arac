import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { dealerships, users } from '@/lib/db/schema';

export type Role = 'owner' | 'manager' | 'sales';

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!profile) return null;

  const [dealership] = await db
    .select()
    .from(dealerships)
    .where(eq(dealerships.id, profile.dealershipId))
    .limit(1);
  if (!dealership) return null;

  return { authId: user.id, profile, dealership };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current || !current.profile.isActive) redirect('/login');
  return current;
}

export async function requireRole(roles: Role[]) {
  const current = await requireUser();
  if (!roles.includes(current.profile.role as Role)) redirect('/dashboard');
  return current;
}

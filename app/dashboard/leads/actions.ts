'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { leads } from '@/lib/db/schema';

const VALID_STATUSES = ['new', 'contacted', 'closed'];

export async function updateLeadStatus(leadId: string, formData: FormData) {
  const { profile } = await requireUser();
  const status = String(formData.get('status') ?? '');
  if (!VALID_STATUSES.includes(status)) return;

  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.dealershipId, profile.dealershipId)))
    .limit(1);
  if (!lead) return;

  await db.update(leads).set({ status }).where(eq(leads.id, leadId));
  revalidatePath('/dashboard/leads');
}

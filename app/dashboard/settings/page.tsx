import { asc, eq } from 'drizzle-orm';
import { Building2, Users } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { saveDealership } from './actions';
import { AddStaffForm } from '@/components/settings/add-staff-form';
import { LogoUpload } from '@/components/settings/logo-upload';
import { StaffToggle } from '@/components/settings/staff-toggle';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Sahip',
  manager: 'Yönetici',
  sales: 'Satış',
};

export default async function SettingsPage() {
  const { profile, dealership } = await requireRole(['owner', 'manager']);

  const staff = await db
    .select()
    .from(users)
    .where(eq(users.dealershipId, profile.dealershipId))
    .orderBy(asc(users.createdAt));

  const workingHours =
    ((dealership.workingHours ?? null) as { text?: string } | null)?.text ?? '';

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
      <p className="mt-1 text-sm text-slate-500">Bayi bilgilerinizi yönetin</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Building2 className="h-5 w-5 text-slate-400" />
            <CardTitle>Bayi Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveDealership} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bayi Adı">
                  <Input name="name" defaultValue={dealership.name ?? ''} required />
                </Field>
                <Field label="Firma Ünvanı">
                  <Input name="legalName" defaultValue={dealership.legalName ?? ''} />
                </Field>
                <Field label="Vergi No">
                  <Input name="taxNumber" defaultValue={dealership.taxNumber ?? ''} />
                </Field>
                <Field label="Telefon">
                  <Input name="phone" defaultValue={dealership.phone ?? ''} required />
                </Field>
                <Field label="WhatsApp">
                  <Input name="whatsappPhone" defaultValue={dealership.whatsappPhone ?? ''} />
                </Field>
                <Field label="E-posta">
                  <Input name="email" type="email" defaultValue={dealership.email ?? ''} />
                </Field>
                <Field label="İl">
                  <Input name="city" defaultValue={dealership.city ?? ''} />
                </Field>
                <Field label="İlçe">
                  <Input name="district" defaultValue={dealership.district ?? ''} />
                </Field>
              </div>
              <Field label="Adres">
                <Textarea name="address" defaultValue={dealership.address ?? ''} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Marka Rengi">
                  <Input
                    name="brandColor"
                    type="color"
                    defaultValue={dealership.brandColor ?? '#0F172A'}
                    className="h-10 w-full"
                  />
                </Field>
                <Field label="Tramer Uyarı Eşiği (₺)">
                  <Input
                    name="tramerAmberThreshold"
                    type="number"
                    defaultValue={dealership.tramerAmberThreshold ?? ''}
                  />
                </Field>
              </div>
              <Field label="Çalışma Saatleri">
                <Textarea
                  name="workingHours"
                  defaultValue={workingHours}
                  placeholder="Örn: Hafta içi 09:00 - 18:00"
                />
              </Field>
              <Button type="submit">Kaydet</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Building2 className="h-5 w-5 text-slate-400" />
              <CardTitle>Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <LogoUpload currentUrl={dealership.logoUrl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-5 w-5 text-slate-400" />
              <CardTitle>Personel</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {member.fullName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ROLE_LABELS[member.role] ?? member.role}
                        {member.phone ? ` · ${member.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.isActive ? (
                        <Badge variant="green">Aktif</Badge>
                      ) : (
                        <Badge variant="slate">Pasif</Badge>
                      )}
                      {profile.role === 'owner' && member.role !== 'owner' && (
                        <StaffToggle userId={member.id} isActive={!!member.isActive} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {profile.role === 'owner' && (
            <Card>
              <CardHeader>
                <Users className="h-5 w-5 text-slate-400" />
                <CardTitle>Personel Ekle</CardTitle>
              </CardHeader>
              <CardContent>
                <AddStaffForm />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

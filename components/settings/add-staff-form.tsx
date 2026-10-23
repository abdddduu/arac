'use client';

import { useActionState } from 'react';
import { addStaff } from '@/app/dashboard/settings/actions';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export function AddStaffForm() {
  const [state, formAction, pending] = useActionState(addStaff, {});
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad Soyad">
          <Input name="fullName" required />
        </Field>
        <Field label="E-posta">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Telefon">
          <Input name="phone" type="tel" />
        </Field>
        <Field label="Rol">
          <Select name="role" defaultValue="sales">
            <option value="manager">Yönetici</option>
            <option value="sales">Satış</option>
          </Select>
        </Field>
      </div>
      <Field label="Geçici Şifre" hint="En az 8 karakter. Personel ilk girişte kullanacak.">
        <Input name="password" type="password" required />
      </Field>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Ekleniyor…' : 'Personel Ekle'}
      </Button>
    </form>
  );
}

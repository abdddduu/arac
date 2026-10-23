'use client';

import { useActionState } from 'react';
import { signup } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, {});
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field label="Bayi Adı" htmlFor="dealershipName">
        <Input id="dealershipName" name="dealershipName" autoComplete="organization" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefon" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
        </Field>
        <Field label="WhatsApp (ops.)" htmlFor="whatsappPhone">
          <Input id="whatsappPhone" name="whatsappPhone" type="tel" />
        </Field>
      </div>
      <Field label="Şehir" htmlFor="city">
        <Input id="city" name="city" required />
      </Field>
      <Field label="Ad Soyad" htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="E-posta" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Şifre" htmlFor="password" hint="En az 8 karakter">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Oluşturuluyor…' : 'Hesap Oluştur'}
      </Button>
    </form>
  );
}

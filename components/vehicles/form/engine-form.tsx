'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateVehicleEngine } from '@/app/dashboard/vehicles/[id]/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { vehicleEngineSchema } from '@/lib/validation/vehicle';
import {
  DRIVETRAIN_LABELS_TR,
  FUEL_LABELS_TR,
  TRANSMISSION_LABELS_TR,
} from '@/lib/status-rules';
import type { ActionResult, VehicleEngineValues } from './types';

type FormValues = z.input<typeof vehicleEngineSchema>;
type FormOutput = z.output<typeof vehicleEngineSchema>;

export function EngineForm({
  vehicleId,
  defaultValues,
}: {
  vehicleId: string;
  defaultValues: VehicleEngineValues;
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(vehicleEngineSchema),
    defaultValues: defaultValues as FormValues,
  });

  const fuel = useWatch({ control, name: 'fuel' });
  const showBattery = fuel === 'electric' || fuel === 'plugin_hybrid';

  const onSubmit = async (values: FormOutput) => {
    setMessage(null);
    const result = (await updateVehicleEngine(vehicleId, values)) as ActionResult;
    if (result.ok) setMessage({ ok: true, text: 'Kaydedildi.' });
    else setMessage({ ok: false, text: result.error });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Motor & Şanzıman</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Yakıt Tipi" error={errors.fuel?.message}>
            <Select {...register('fuel')}>
              {Object.entries(FUEL_LABELS_TR).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Şanzıman" error={errors.transmission?.message}>
            <Select {...register('transmission')}>
              {Object.entries(TRANSMISSION_LABELS_TR).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Çekiş">
            <Select {...register('drivetrain')}>
              <option value="">Seçin</option>
              {Object.entries(DRIVETRAIN_LABELS_TR).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Motor Hacmi (cc)">
            <Input type="number" {...register('engineCc')} placeholder="Örn. 1998" />
          </Field>
          <Field label="Beygir Gücü (hp)">
            <Input type="number" {...register('horsepower')} placeholder="Örn. 184" />
          </Field>
          <Field label="Tork (Nm)">
            <Input type="number" {...register('torqueNm')} placeholder="Örn. 300" />
          </Field>
          {showBattery && (
            <>
              <Field label="Batarya (kWh)">
                <Input type="number" step="0.1" {...register('batteryKwh')} placeholder="Örn. 82" />
              </Field>
              <Field label="Menzil (km)">
                <Input type="number" {...register('rangeKm')} placeholder="Örn. 520" />
              </Field>
            </>
          )}
          <Field label="Önceki Sahip Sayısı">
            <Input type="number" {...register('previousOwners')} placeholder="Örn. 1" />
          </Field>
          <Field label="Garanti Bitiş Tarihi">
            <Input type="date" {...register('warrantyUntil')} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
        {message && (
          <p className={message.ok ? 'text-sm text-emerald-600' : 'text-sm text-red-600'}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

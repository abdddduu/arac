'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { updateVehicleBasic } from '@/app/dashboard/vehicles/[id]/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { vehicleBasicSchema } from '@/lib/validation/vehicle';
import { COMMON_FEATURES, type ActionResult, type VehicleBasicValues } from './types';

type FormValues = z.input<typeof vehicleBasicSchema>;
type FormOutput = z.output<typeof vehicleBasicSchema>;

export function BasicForm({
  vehicleId,
  defaultValues,
}: {
  vehicleId: string;
  defaultValues: VehicleBasicValues;
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [featureInput, setFeatureInput] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(vehicleBasicSchema),
    defaultValues: defaultValues as FormValues,
  });

  const features = getValues('features') ?? [];

  const addFeature = (feature: string) => {
    const trimmed = feature.trim();
    if (!trimmed) return;
    setValue('features', [...new Set([...(getValues('features') ?? []), trimmed])], { shouldValidate: true });
    setFeatureInput('');
  };

  const removeFeature = (feature: string) => {
    setValue(
      'features',
      (getValues('features') ?? []).filter((f) => f !== feature),
    );
  };

  const onSubmit = async (values: FormOutput) => {
    setMessage(null);
    const result = (await updateVehicleBasic(vehicleId, values)) as ActionResult;
    if (result.ok) setMessage({ ok: true, text: 'Kaydedildi.' });
    else setMessage({ ok: false, text: result.fieldErrors?.vin ?? result.error });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Temel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Marka" error={errors.make?.message}>
            <Input {...register('make')} />
          </Field>
          <Field label="Model" error={errors.model?.message}>
            <Input {...register('model')} />
          </Field>
          <Field label="Paket / Donanım">
            <Input {...register('trim')} />
          </Field>
          <Field label="Yıl" error={errors.year?.message}>
            <Input type="number" {...register('year')} />
          </Field>
          <Field label="Şase Numarası (VIN)" error={errors.vin?.message} className="sm:col-span-2">
            <Input {...register('vin')} className="uppercase" />
          </Field>
          <Field label="Plaka">
            <Input {...register('plate')} />
          </Field>
          <Field label="Kilometre" error={errors.mileageKm?.message}>
            <Input type="number" {...register('mileageKm')} />
          </Field>
          <Field label="Gövde Tipi">
            <Select {...register('bodyType')}>
              <option value="">Seçin</option>
              <option value="sedan">Sedan</option>
              <option value="hatchback">Hatchback</option>
              <option value="suv">SUV</option>
              <option value="coupe">Coupe</option>
              <option value="cabrio">Cabrio</option>
              <option value="station">Station</option>
              <option value="pickup">Pickup</option>
            </Select>
          </Field>
          <Field label="Renk">
            <Input {...register('color')} />
          </Field>
          <Field label="Fiyat (₺)" error={errors.price?.message}>
            <Input type="number" step="0.01" min="0" {...register('price')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fiyat & Açıklama</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('priceVisible')} className="h-4 w-4" />
            Fiyatı göster
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('isNegotiable')} className="h-4 w-4" />
            Pazarlığa açık
          </label>
          <Field label="Açıklama" className="sm:col-span-2">
            <Textarea {...register('description')} placeholder="Araç hakkında kısa açıklama" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Özellikler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800"
              >
                {feature}
                <button
                  type="button"
                  onClick={() => removeFeature(feature)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label={`${feature} kaldır`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFeature(featureInput);
                }
              }}
              placeholder="Özellik yazın ve Enter'a basın"
            />
            <Button type="button" variant="secondary" onClick={() => addFeature(featureInput)}>
              Ekle
            </Button>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500">Önerilenler</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMMON_FEATURES.filter((f) => !features.includes(f)).map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() => addFeature(feature)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
                >
                  + {feature}
                </button>
              ))}
            </div>
          </div>
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

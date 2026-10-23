'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createVehicle } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { vehicleBasicSchema } from '@/lib/validation/vehicle';
import {
  DRIVETRAIN_LABELS_TR,
  FUEL_LABELS_TR,
  TRANSMISSION_LABELS_TR,
} from '@/lib/status-rules';

const schema = vehicleBasicSchema.extend({
  fuel: z.enum(['gasoline', 'diesel', 'lpg', 'hybrid', 'plugin_hybrid', 'electric']),
  transmission: z.enum(['manual', 'automatic', 'semi_automatic', 'cvt', 'dct']),
  drivetrain: z.enum(['fwd', 'rwd', 'awd', '4wd']).optional(),
});

type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const defaultValues: FormValues = {
  make: '',
  model: '',
  trim: '',
  year: new Date().getFullYear(),
  vin: '',
  plate: '',
  mileageKm: 0,
  bodyType: '',
  color: '',
  price: undefined,
  currency: 'TRY',
  priceVisible: true,
  isNegotiable: false,
  description: '',
  features: [],
  fuel: 'gasoline',
  transmission: 'automatic',
};

export default function NewVehiclePage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues });

  const onSubmit = async (values: FormOutput) => {
    setServerError(null);
    const result = await createVehicle(values);
    if (result && !result.ok) {
      setServerError(result.error);
      if (result.fieldErrors?.vin) setFieldError({ vin: result.fieldErrors.vin });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Yeni Araç Ekle</h1>
      <p className="mt-1 text-sm text-slate-500">
        Temel bilgileri girin, kaydettikten sonra diğer sekmelerden devam edin.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Marka" error={errors.make?.message}>
              <Input {...register('make')} placeholder="Örn. BMW" />
            </Field>
            <Field label="Model" error={errors.model?.message}>
              <Input {...register('model')} placeholder="Örn. 320i" />
            </Field>
            <Field label="Paket / Donanım">
              <Input {...register('trim')} placeholder="Örn. M Sport" />
            </Field>
            <Field label="Yıl" error={errors.year?.message}>
              <Input type="number" {...register('year')} />
            </Field>
            <Field
              label="Şase Numarası (VIN)"
              error={errors.vin?.message ?? fieldError.vin}
              className="sm:col-span-2"
            >
              <Input {...register('vin')} placeholder="17 haneli VIN" className="uppercase" />
            </Field>
            <Field label="Plaka">
              <Input {...register('plate')} placeholder="Örn. 34 ABC 123" />
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
              <Input {...register('color')} placeholder="Örn. Siyah" />
            </Field>
            <Field label="Fiyat (₺)" error={errors.price?.message}>
              <Input type="number" step="0.01" min="0" {...register('price')} />
            </Field>
            <Field label="Açıklama" className="sm:col-span-2">
              <Textarea {...register('description')} placeholder="Araç hakkında kısa açıklama" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Motor & Şanzıman (Zorunlu)</CardTitle>
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
          </CardContent>
        </Card>

        {serverError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Aracı Oluştur'}
          </Button>
        </div>
      </form>
    </div>
  );
}

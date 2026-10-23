'use client';

import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { updateVehicleCondition } from '@/app/dashboard/vehicles/[id]/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CarDiagram } from '@/components/vehicles/car-diagram';
import { conditionSchema } from '@/lib/validation/vehicle';
import {
  PANEL_LABELS_TR,
  PANEL_STATE_COLORS,
  PANEL_STATE_LABELS_TR,
  daysUntil,
  tireLight,
  tuvturkLight,
  type PanelCode,
  type PanelState,
} from '@/lib/status-rules';
import { formatPrice } from '@/lib/utils';
import type { ActionResult, ConditionValues } from './types';

type FormValues = z.input<typeof conditionSchema>;
type FormOutput = z.output<typeof conditionSchema>;

const PANEL_STATES: PanelState[] = ['original', 'local_paint', 'painted', 'replaced', 'plastic_repair'];

const panelStateMap: Record<PanelState, PanelState> = {
  original: 'local_paint',
  local_paint: 'painted',
  painted: 'replaced',
  replaced: 'plastic_repair',
  plastic_repair: 'original',
};

const MECH_CATEGORIES = [
  'Motor',
  'Şanzıman',
  'Fren Sistemi',
  'Süspansiyon',
  'Elektrik',
  'Klima',
  'Direksiyon',
  'Egzoz',
];

const MECH_STATUSES: { value: 'ok' | 'attention' | 'fault'; label: string; classes: string }[] = [
  { value: 'ok', label: 'İyi', classes: 'bg-emerald-100 text-emerald-700' },
  { value: 'attention', label: 'Dikkat', classes: 'bg-amber-100 text-amber-800' },
  { value: 'fault', label: 'Arızalı', classes: 'bg-red-100 text-red-700' },
];

export function ConditionForm({
  vehicleId,
  defaultValues,
}: {
  vehicleId: string;
  defaultValues: ConditionValues;
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(conditionSchema),
    defaultValues: defaultValues as FormValues,
  });

  const panels = useFieldArray({ control, name: 'panels' });
  const tramerRecords = useFieldArray({ control, name: 'tramerRecords' });
  const tires = useFieldArray({ control, name: 'tires' });
  const mechanicalChecks = useFieldArray({ control, name: 'mechanicalChecks' });

  const panelStates = watch('panels') as ConditionValues['panels'];
  const panelMap = Object.fromEntries(panelStates.map((p) => [p.panel, p.state])) as Record<
    PanelCode,
    PanelState
  >;

  const cyclePanel = (code: PanelCode) => {
    const index = panels.fields.findIndex((f) => f.panel === code);
    if (index < 0) return;
    const current = panelMap[code] ?? 'original';
    setValue(`panels.${index}.state`, panelStateMap[current] as PanelState);
  };

  const hasSpare = tires.fields.some((t) => t.position === 'SPARE');
  const tramerTotal = tramerRecords.fields.reduce(
    (sum, _, i) => sum + (Number(getValues(`tramerRecords.${i}.amount`)) || 0),
    0,
  );
  const tuvturk = watch('tuvturkValidUntil') as string | undefined;
  const tuvturkLightState = tuvturkLight(tuvturk ?? null);
  const tuvturkDays = tuvturk ? daysUntil(tuvturk) : null;

  const onSubmit = async (values: FormOutput) => {
    setMessage(null);
    const result = (await updateVehicleCondition(vehicleId, values)) as ActionResult;
    if (result.ok) setMessage({ ok: true, text: 'Kaydedildi.' });
    else setMessage({ ok: false, text: result.error });
  };

  const addTire = () => {
    if (!hasSpare) tires.append({ position: 'SPARE', brand: '', size: '', season: '', treadMm: undefined, dotYear: undefined });
  };

  const addCustomCheck = () => {
    const category = customCategory.trim();
    if (!category) return;
    if (mechanicalChecks.fields.some((c) => c.category === category)) return;
    mechanicalChecks.append({ category, status: 'ok', note: '' });
    setCustomCategory('');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Panel Durumları</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="flex justify-center">
            <CarDiagram panels={panelMap} onPanelClick={cyclePanel} size={190} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">
              Diyagramda bir panele tıklayarak durumunu değiştirin. Sıralama: Orijinal → Lokal Boyalı → Boyalı → Değişen → Plastik/Macun.
            </p>
            <div className="flex flex-wrap gap-2">
              {PANEL_STATES.map((state) => (
                <span
                  key={state}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-slate-700"
                  style={{ backgroundColor: `${PANEL_STATE_COLORS[state]}22` }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PANEL_STATE_COLORS[state] }} />
                  {PANEL_STATE_LABELS_TR[state]}
                </span>
              ))}
            </div>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
              {panels.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-sm text-slate-700">
                    {PANEL_LABELS_TR[field.panel as PanelCode]}
                  </span>
                  <select
                    {...register(`panels.${index}.state`)}
                    className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-slate-400"
                  >
                    {PANEL_STATES.map((state) => (
                      <option key={state} value={state}>
                        {PANEL_STATE_LABELS_TR[state]}
                      </option>
                    ))}
                  </select>
                  <Input
                    {...register(`panels.${index}.paintMicrons`)}
                    type="number"
                    min="0"
                    placeholder="µm"
                    className="h-9 w-20"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tramer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <Switch {...register('hasHeavyDamage')} />
            Ağır hasar kaydı var
          </label>
          <div className="divide-y divide-slate-100">
            {tramerRecords.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-4">
                <Field label="Tarih">
                  <Input type="date" {...register(`tramerRecords.${index}.incidentDate`)} />
                </Field>
                <Field label="Tutar (₺)" error={errors.tramerRecords?.[index]?.amount?.message}>
                  <Input type="number" step="0.01" {...register(`tramerRecords.${index}.amount`)} />
                </Field>
                <Field label="Açıklama" className="sm:col-span-2">
                  <div className="flex gap-2">
                    <Input {...register(`tramerRecords.${index}.description`)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => tramerRecords.remove(index)}
                      aria-label="Kaydı sil"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </Field>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="secondary" size="sm" onClick={() => tramerRecords.append({ incidentDate: '', amount: 0, description: '' })}>
              <Plus className="h-4 w-4" />
              Kayıt Ekle
            </Button>
            <p className="text-sm text-slate-700">
              Toplam: <span className="font-semibold">{formatPrice(tramerTotal)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TÜVTÜRK</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Field label="Geçerlilik Bitiş Tarihi">
            <Input type="date" {...register('tuvturkValidUntil')} className="w-48" />
          </Field>
          {tuvturkLightState !== 'unknown' && (
            <span>
              {tuvturkLightState === 'green' && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  Geçerli ({tuvturkDays} gün)
                </span>
              )}
              {tuvturkLightState === 'amber' && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
                  Yaklaşıyor ({tuvturkDays} gün)
                </span>
              )}
              {tuvturkLightState === 'red' && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                  Süresi dolmuş
                </span>
              )}
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Lastikler</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={addTire} disabled={hasSpare}>
            <Plus className="h-4 w-4" />
            Stepne ekle
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {tires.fields.map((field, index) => {
            const tread = getValues(`tires.${index}.treadMm`);
            const treadNum =
              tread === undefined || tread === null || tread === '' ? null : Number(tread);
            const light = tireLight(treadNum);
            return (
              <div key={field.id} className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-6">
                <div className="flex items-center font-semibold text-slate-700">{field.position}</div>
                <Field label="Marka">
                  <Input {...register(`tires.${index}.brand`)} />
                </Field>
                <Field label="Ebat">
                  <Input {...register(`tires.${index}.size`)} placeholder="Örn. 225/45 R18" />
                </Field>
                <Field label="Sezon">
                  <select
                    {...register(`tires.${index}.season`)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">Seçin</option>
                    <option value="summer">Yaz</option>
                    <option value="winter">Kış</option>
                    <option value="all_season">4 Mevsim</option>
                  </select>
                </Field>
                <Field label="Diş (mm)">
                  <Input type="number" step="0.1" min="0" max="15" {...register(`tires.${index}.treadMm`)} />
                </Field>
                <Field label="Üretim Yılı">
                  <Input type="number" {...register(`tires.${index}.dotYear`)} placeholder="Örn. 2023" />
                </Field>
                {light !== 'unknown' && (
                  <span
                    className={`col-span-2 flex h-7 w-fit items-center rounded-full px-3 text-xs font-medium sm:col-span-6 ${
                      light === 'green'
                        ? 'bg-emerald-100 text-emerald-700'
                        : light === 'amber'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {light === 'green'
                      ? 'Diş derinliği yeterli'
                      : light === 'amber'
                        ? 'Diş derinliği azaldı'
                        : 'Diş derinliği kritik'}
                  </span>
                )}
              </div>
            );
          })}
          {tires.fields.length === 0 && (
            <p className="text-sm text-slate-500">Lastik bilgisi bulunmuyor.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mekanik Kontroller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mechanicalChecks.fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
              <span className="w-40 shrink-0 text-sm font-medium text-slate-800">{field.category}</span>
              <div className="flex gap-1">
                {MECH_STATUSES.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setValue(`mechanicalChecks.${index}.status`, status.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      getValues(`mechanicalChecks.${index}.status`) === status.value
                        ? status.classes
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
              <Input
                {...register(`mechanicalChecks.${index}.note`)}
                placeholder="Not"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => mechanicalChecks.remove(index)}
                aria-label="Kontrolü sil"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {MECH_CATEGORIES.filter(
              (category) => !mechanicalChecks.fields.some((c) => c.category === category),
            ).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => mechanicalChecks.append({ category, status: 'ok', note: '' })}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                + {category}
              </button>
            ))}
            <div className="flex gap-2">
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomCheck();
                  }
                }}
                placeholder="Özel kategori ekle"
                className="w-48"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addCustomCheck}>
                Ekle
              </Button>
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

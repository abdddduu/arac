'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, FileText, Radio } from 'lucide-react';
import { updateVehicleStatus } from '@/app/dashboard/vehicles/actions';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_LABELS_TR, type VehicleStatus } from '@/lib/status-rules';

const STATUS_BUTTONS: { status: VehicleStatus; classes: string }[] = [
  { status: 'draft', classes: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
  { status: 'active', classes: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  { status: 'reserved', classes: 'bg-amber-100 text-amber-800 hover:bg-amber-200' },
  { status: 'sold', classes: 'bg-red-100 text-red-700 hover:bg-red-200' },
];

export function PublishPanel({
  vehicleId,
  status,
  publicUrl,
  hasPhoto,
  hasPrice,
  conditionFilled,
  tuvturkSet,
  totalScans,
  recentScans,
}: {
  vehicleId: string;
  status: VehicleStatus;
  publicUrl: string;
  hasPhoto: boolean;
  hasPrice: boolean;
  conditionFilled: boolean;
  tuvturkSet: boolean;
  totalScans: number;
  recentScans: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const setStatus = (next: VehicleStatus) => {
    if (next === status) return;
    startTransition(async () => {
      await updateVehicleStatus(vehicleId, next);
      router.refresh();
    });
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const checklist = [
    { label: 'En az 1 fotoğraf', ok: hasPhoto },
    { label: 'Fiyat belirlenmiş', ok: hasPrice },
    { label: 'Durum raporu dolu', ok: conditionFilled, info: !conditionFilled },
    { label: 'TÜVTÜRK tarihi girilmiş', ok: tuvturkSet },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Yayın Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_BUTTONS.map(({ status: s, classes }) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => setStatus(s)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  status === s ? 'ring-2 ring-slate-900 ring-inset ' + classes : classes
                }`}
              >
                {STATUS_LABELS_TR[s]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yayına Hazırlık</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                {item.ok ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-slate-300" />
                )}
                <span className={item.ok ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
                {item.info && <span className="text-xs text-slate-400">(bilgi amaçlı)</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Herkese Açık Sayfa & QR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-5 sm:flex-row">
          <a href={`/api/vehicles/${vehicleId}/qr?format=svg`} target="_blank" rel="noopener noreferrer">
            <img
              src={`/api/vehicles/${vehicleId}/qr?format=svg`}
              alt="QR kod"
              width={140}
              height={140}
              className="rounded-lg border border-slate-200"
            />
          </a>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">{publicUrl}</code>
              <Button type="button" variant="outline" size="sm" onClick={copyUrl}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/api/vehicles/${vehicleId}/sticker?format=a4`} target="_blank" variant="secondary" size="sm">
                <FileText className="h-4 w-4" />
                Etiket PDF (A4)
              </ButtonLink>
              <ButtonLink href={`/api/vehicles/${vehicleId}/sticker?format=a5`} target="_blank" variant="secondary" size="sm">
                <FileText className="h-4 w-4" />
                A5
              </ButtonLink>
              <ButtonLink href={`/api/vehicles/${vehicleId}/sticker?format=10x15`} target="_blank" variant="secondary" size="sm">
                <FileText className="h-4 w-4" />
                10x15
              </ButtonLink>
              <ButtonLink href={`/dashboard/nfc?vehicle=${vehicleId}`} variant="secondary" size="sm">
                <Radio className="h-4 w-4" />
                NFC&apos;ye Yaz
              </ButtonLink>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ziyaret (Tarama) İstatistikleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalScans}</p>
              <p className="text-xs text-slate-500">Toplam ziyaret</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{recentScans}</p>
              <p className="text-xs text-slate-500">Son 7 gün</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

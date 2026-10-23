'use client';

import { useState } from 'react';
import { CalendarClock, Loader2, Phone, X } from 'lucide-react';
import { waLink, telLink } from '@/lib/phone';
import { cn } from '@/lib/utils';

type CtaBarProps = {
  publicId: string;
  vehicleName: string;
  vehicleUrl: string;
  phone: string;
  whatsappPhone: string | null;
  sold: boolean;
};

export function CtaBar({
  publicId,
  vehicleName,
  vehicleUrl,
  phone,
  whatsappPhone,
  sold,
}: CtaBarProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const beaconClick = (type: 'whatsapp_click' | 'call_click') => {
    try {
      navigator.sendBeacon(
        '/api/public/leads',
        new Blob([JSON.stringify({ publicId, type })], { type: 'text/plain' }),
      );
    } catch {
      // beacon failure is non-blocking
    }
  };

  const whatsappText = `Merhaba, ${vehicleName} (${vehicleUrl}) hakkında bilgi almak istiyorum.`;

  const submit = async (formData: FormData) => {
    setBusy(true);
    setMessage(null);
    const payload = {
      publicId,
      type: 'test_drive',
      name: String(formData.get('name') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      preferredAt: String(formData.get('preferredAt') ?? ''),
      note: String(formData.get('note') ?? ''),
      website: String(formData.get('website') ?? ''),
    };
    try {
      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setMessage('Talebiniz alındı, en kısa sürede dönüş yapacağız.');
        formData.set('name', '');
        formData.set('phone', '');
        formData.set('note', '');
      } else if (response.status === 429) {
        const data = await response.json().catch(() => null);
        setMessage(data?.error ?? 'Çok fazla talep gönderdiniz.');
      } else {
        setMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    } catch {
      setMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
    setBusy(false);
  };

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-3">
          {whatsappPhone && (
            <a
              href={waLink(whatsappPhone, whatsappText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => beaconClick('whatsapp_click')}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#25D366] text-sm font-semibold text-white"
            >
              WhatsApp
            </a>
          )}
          <a
            href={telLink(phone)}
            onClick={() => beaconClick('call_click')}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900"
          >
            <Phone className="h-4 w-4" />
            Ara
          </a>
          {!sold && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--brand, #0F172A)' }}
            >
              <CalendarClock className="h-4 w-4" />
              Test Sürüşü
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-2xl bg-white p-5 pb-8"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Test Sürüşü Talebi</h3>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">{vehicleName}</p>
            <form action={submit} className="mt-4 space-y-3">
              <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="ts-name">
                  Ad Soyad
                </label>
                <input
                  id="ts-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="ts-phone">
                  Telefon
                </label>
                <input
                  id="ts-phone"
                  name="phone"
                  required
                  minLength={7}
                  maxLength={20}
                  inputMode="tel"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="ts-when">
                  Tercih Edilen Tarih ve Saat
                </label>
                <input
                  id="ts-when"
                  name="preferredAt"
                  type="datetime-local"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="ts-note">
                  Not
                </label>
                <textarea
                  id="ts-note"
                  name="note"
                  rows={3}
                  maxLength={500}
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand, #0F172A)' }}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Talebi Gönder
              </button>
              {message && (
                <p
                  className={cn(
                    'text-sm',
                    message.startsWith('Talebiniz') ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

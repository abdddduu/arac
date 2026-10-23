'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Eye, Pencil, Printer } from 'lucide-react';
import { cn, formatKm, formatPrice } from '@/lib/utils';
import type { VehicleStatus } from '@/lib/status-rules';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusSelect } from './status-select';

export type VehicleRow = {
  id: string;
  publicId: string;
  status: VehicleStatus;
  make: string;
  model: string;
  year: number;
  plate: string | null;
  mileageKm: number;
  price: string | null;
  coverUrl: string | null;
  scanCount: number;
};

export function VehicleTable({ rows }: { rows: VehicleRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-700">Araç bulunamadı</p>
        <p className="mt-1 text-sm text-slate-500">Filtreleri değiştirin veya yeni bir araç ekleyin.</p>
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  };

  const printSelected = () => {
    const ids = [...selected].join(',');
    window.open(`/api/stickers/batch?ids=${ids}`, '_blank');
  };

  const rowActions = (row: VehicleRow) => (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/vehicles/${row.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        <Pencil className="h-3.5 w-3.5" />
        Düzenle
      </Link>
      <Link
        href={`/v/${row.publicId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        <Eye className="h-3.5 w-3.5" />
        Sayfayı Gör
      </Link>
      <Link
        href={`/api/vehicles/${row.id}/sticker`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        <Printer className="h-3.5 w-3.5" />
        Etiket PDF
      </Link>
    </div>
  );

  const thumbnail = (row: VehicleRow) =>
    row.coverUrl ? (
      <Image
        src={row.coverUrl}
        alt=""
        width={64}
        height={48}
        unoptimized
        className="h-12 w-16 rounded-md object-cover"
      />
    ) : (
      <div className="flex h-12 w-16 items-center justify-center rounded-md bg-slate-100 text-slate-400">
        <span className="text-lg">🚗</span>
      </div>
    );

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={printSelected}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Seçilenlerin etiketlerini yazdır ({selected.size})
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Tümünü seç"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="px-2 py-3">Araç</th>
                <th className="px-4 py-3">Plaka</th>
                <th className="px-4 py-3">KM</th>
                <th className="px-4 py-3">Fiyat</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Ziyaret</th>
                <th className="px-4 py-3">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className={cn('hover:bg-slate-50', selected.has(row.id) && 'bg-slate-50')}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`${row.make} ${row.model} seç`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {thumbnail(row)}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {row.make} {row.model} · {row.year}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.plate ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatKm(row.mileageKm)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPrice(row.price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.status} />
                      <StatusSelect vehicleId={row.id} status={row.status} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="slate">{row.scanCount}</Badge>
                  </td>
                  <td className="px-4 py-3">{rowActions(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                aria-label={`${row.make} ${row.model} seç`}
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
                className="mt-4 h-4 w-4 rounded border-slate-300"
              />
              {thumbnail(row)}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {row.make} {row.model} · {row.year}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{row.plate ?? 'Plaka yok'}</p>
                <p className="mt-1 text-sm text-slate-700">{formatPrice(row.price)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <StatusBadge status={row.status} />
              <StatusSelect vehicleId={row.id} status={row.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {rowActions(row)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

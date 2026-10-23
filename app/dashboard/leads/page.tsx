import Link from 'next/link';
import { and, count, desc, eq, gte, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { leads, vehicles } from '@/lib/db/schema';
import { formatDate } from '@/lib/utils';
import { telLink, waLink } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { updateLeadStatus } from './actions';

const LEAD_TYPES = ['all', 'test_drive', 'whatsapp_click', 'call_click'] as const;
const LEAD_STATUSES = ['all', 'new', 'contacted', 'closed'] as const;

const TYPE_LABELS: Record<string, string> = {
  test_drive: 'Test Sürüşü',
  whatsapp_click: 'WhatsApp',
  call_click: 'Çağrı',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  contacted: 'İletişime Geçildi',
  closed: 'Kapandı',
};

function formatPreferredAt(value: Date | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { profile } = await requireUser();
  const params = await searchParams;
  const dealershipId = profile.dealershipId;

  const typeParam = params.type ?? 'all';
  const type = (LEAD_TYPES as readonly string[]).includes(typeParam) ? typeParam : 'all';
  const statusParam = params.status ?? 'all';
  const status = (LEAD_STATUSES as readonly string[]).includes(statusParam) ? statusParam : 'all';

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const conditions = [
    eq(leads.dealershipId, dealershipId),
    ...(type !== 'all' ? [eq(leads.type, type)] : []),
    ...(status !== 'all' ? [eq(leads.status, status)] : []),
  ];

  const [leadRows, vehicleRows, countRows] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt)),
    db
      .select({ id: vehicles.id, publicId: vehicles.publicId, make: vehicles.make, model: vehicles.model, year: vehicles.year })
      .from(vehicles)
      .where(eq(vehicles.dealershipId, dealershipId)),
    db
      .select({ type: leads.type, value: count() })
      .from(leads)
      .where(and(eq(leads.dealershipId, dealershipId), gte(leads.createdAt, thirtyDaysAgo)))
      .groupBy(leads.type),
  ]);

  const vehicleById = new Map(vehicleRows.map((v) => [v.id, v]));
  const counts = { test_drive: 0, whatsapp_click: 0, call_click: 0 };
  for (const row of countRows) {
    if (row.type && row.type in counts) counts[row.type as keyof typeof counts] = row.value;
  }

  const testDrives = leadRows.filter((l) => l.type === 'test_drive');
  const clicks = leadRows.filter((l) => l.type === 'whatsapp_click' || l.type === 'call_click');

  return (
    <div className="p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Talepler</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ziyaretçilerin WhatsApp, çağrı ve test sürüşü talepleri.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {(['test_drive', 'whatsapp_click', 'call_click'] as const).map((t) => (
          <div key={t} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-2xl font-bold text-slate-900">{counts[t]}</p>
            <p className="text-xs text-slate-500">{TYPE_LABELS[t]} · son 30 gün</p>
          </div>
        ))}
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="Tür">
          <Select name="type" defaultValue={type ?? 'all'} className="min-w-44">
            {LEAD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'Tümü' : TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Durum">
          <Select name="status" defaultValue={status ?? 'all'} className="min-w-44">
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Tümü' : STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="secondary">
          Filtrele
        </Button>
      </form>

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="text-base font-semibold text-slate-900">Test Sürüşü Talepleri</h2>
          {testDrives.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Test sürüşü talebi yok.</p>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {testDrives.map((lead) => {
                const vehicle = vehicleById.get(lead.vehicleId);
                return (
                  <div key={lead.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {lead.name} {lead.phone && <span className="text-slate-400">· {lead.phone}</span>}
                        </p>
                        {vehicle && (
                          <Link
                            href={`/v/${vehicle.publicId}`}
                            target="_blank"
                            className="mt-0.5 block text-sm text-blue-600 hover:underline"
                          >
                            {vehicle.make} {vehicle.model} · {vehicle.year}
                          </Link>
                        )}
                      </div>
                      <StatusControl leadId={lead.id} status={lead.status ?? 'new'} />
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p>Tercih edilen zaman: {formatPreferredAt(lead.preferredAt)}</p>
                      {lead.note && <p className="whitespace-pre-line text-slate-500">Not: {lead.note}</p>}
                      <p className="text-xs text-slate-400">{formatDate(lead.createdAt)}</p>
                    </div>
                    {lead.phone && (
                      <div className="mt-3 flex gap-2">
                        <a
                          href={telLink(lead.phone)}
                          className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Ara
                        </a>
                        <a
                          href={waLink(lead.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">Tıklama Kayıtları</h2>
          {clicks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Tıklama kaydı yok.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tür</th>
                    <th className="px-4 py-3">Araç</th>
                    <th className="px-4 py-3">Telefon</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clicks.map((lead) => {
                    const vehicle = vehicleById.get(lead.vehicleId);
                    return (
                      <tr key={lead.id}>
                        <td className="px-4 py-3 text-slate-700">{TYPE_LABELS[lead.type ?? ''] ?? lead.type}</td>
                        <td className="px-4 py-3">
                          {vehicle ? (
                            <Link href={`/v/${vehicle.publicId}`} target="_blank" className="text-blue-600 hover:underline">
                              {vehicle.make} {vehicle.model} · {vehicle.year}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{lead.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(lead.createdAt)}</td>
                        <td className="px-4 py-3">
                          <StatusControl leadId={lead.id} status={lead.status ?? 'new'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusControl({ leadId, status }: { leadId: string; status: string }) {
  return (
    <form action={updateLeadStatus.bind(null, leadId)}>
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex items-center gap-1.5">
        <select
          name="status"
          defaultValue={status}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm"
        >
          {LEAD_STATUSES.filter((s) => s !== 'all').map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Güncelle
        </Button>
      </div>
    </form>
  );
}

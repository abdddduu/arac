import Link from 'next/link';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { vehicleTags, vehicles } from '@/lib/db/schema';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NfcWriter, type NfcQueueItem } from '@/components/nfc/nfc-writer';
import { deactivateTag, reassignTag } from './actions';

export default async function NfcPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const { profile } = await requireUser();
  const params = await searchParams;
  const dealershipId = profile.dealershipId;
  const preselected = params.vehicle ?? undefined;

  const vehicleRows = await db
    .select({
      id: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      publicId: vehicles.publicId,
    })
    .from(vehicles)
    .where(
      and(eq(vehicles.dealershipId, dealershipId), inArray(vehicles.status, ['active', 'reserved'])),
    )
    .orderBy(desc(vehicles.updatedAt));

  const vehicleIds = vehicleRows.map((v) => v.id);
  const tagRows = vehicleIds.length
    ? await db
        .select({
          id: vehicleTags.id,
          vehicleId: vehicleTags.vehicleId,
          nfcUid: vehicleTags.nfcUid,
          token: vehicleTags.token,
          isActive: vehicleTags.isActive,
          writtenAt: vehicleTags.writtenAt,
        })
        .from(vehicleTags)
        .where(inArray(vehicleTags.vehicleId, vehicleIds))
        .orderBy(desc(vehicleTags.createdAt))
    : [];

  const activeByVehicle = new Map<string, typeof tagRows[number]>();
  for (const tag of tagRows) {
    if (tag.isActive && !activeByVehicle.has(tag.vehicleId)) activeByVehicle.set(tag.vehicleId, tag);
  }

  const queueItems: NfcQueueItem[] = vehicleRows.map((v) => ({
    vehicleId: v.id,
    label: `${v.make} ${v.model} · ${v.year}`,
    hasActiveTag: activeByVehicle.has(v.id),
  }));

  const activeTags = tagRows.filter((t) => t.isActive);
  const otherVehicles = vehicleRows.filter((v) => !activeByVehicle.has(v.id));

  const vehicleById = new Map(vehicleRows.map((v) => [v.id, v]));

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">NFC Etiket Yazma</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fiziksel NFC kartları aracınızın dijital kimlik sayfasına bağlayın.
          </p>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Nasıl Çalışır?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <ul className="list-inside list-disc space-y-1.5">
            <li>Web NFC, HTTPS üzerinden Chrome on Android tarayıcısında çalışır.</li>
            <li>NTAG213 / NTAG215 kartları önerilir.</li>
            <li>iPhone&apos;lar kartları okuyabilir ancak web üzerinden yazamaz.</li>
            <li>
              Bilgisayarda yazmak için CSV dosyasını indirip ACR122U okuyucu ve NFC Tools
              uygulamasını kullanın.
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6">
        <NfcWriter items={queueItems} initialPreselected={preselected} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Mevcut NFC Kartları</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTags.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz aktif NFC kartı yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Araç</th>
                    <th className="px-3 py-2">Kart Seri No</th>
                    <th className="px-3 py-2">Yazılma Tarihi</th>
                    <th className="px-3 py-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTags.map((tag) => {
                    const vehicle = vehicleById.get(tag.vehicleId);
                    if (!vehicle) return null;
                    return (
                      <tr key={tag.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          <Link href={`/v/${vehicle.publicId}`} target="_blank" className="hover:underline">
                            {vehicle.make} {vehicle.model} · {vehicle.year}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{tag.nfcUid ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(tag.writtenAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <form action={deactivateTag.bind(null, tag.id)}>
                              <Button type="submit" variant="outline" size="sm">
                                Devre dışı bırak
                              </Button>
                            </form>
                            {otherVehicles.length > 0 && (
                              <form
                                action={async (formData: FormData) => {
                                  'use server';
                                  const target = String(formData.get('vehicleId') ?? '');
                                  if (target) await reassignTag(tag.id, target);
                                }}
                                className="flex items-center gap-1.5"
                              >
                                <select
                                  name="vehicleId"
                                  defaultValue=""
                                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                                >
                                  <option value="" disabled>
                                    Başka araca ata...
                                  </option>
                                  {otherVehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.make} {v.model} · {v.year}
                                    </option>
                                  ))}
                                </select>
                                <Button type="submit" variant="secondary" size="sm">
                                  Ata
                                </Button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from 'next/link';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { Car, CheckSquare, Inbox, ScanLine, Tag } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { leads, scanEvents, vehicles } from '@/lib/db/schema';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const dealershipId = profile.dealershipId;

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const [counts] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${vehicles.status} = 'active')`,
      reserved: sql<number>`count(*) filter (where ${vehicles.status} = 'reserved')`,
      sold: sql<number>`count(*) filter (where ${vehicles.status} = 'sold')`,
    })
    .from(vehicles)
    .where(eq(vehicles.dealershipId, dealershipId));

  const [scans] = await db
    .select({ value: count() })
    .from(scanEvents)
    .innerJoin(vehicles, eq(scanEvents.vehicleId, vehicles.id))
    .where(
      and(eq(vehicles.dealershipId, dealershipId), gte(scanEvents.createdAt, sevenDaysAgo)),
    );

  const [newLeads] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.dealershipId, dealershipId), eq(leads.status, 'new')));

  const recentVehicles = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.dealershipId, dealershipId))
    .orderBy(desc(vehicles.createdAt))
    .limit(5);

  const kpis = [
    { label: 'Satıştaki Araçlar', value: counts.active, icon: Car, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Rezerve Araçlar', value: counts.reserved, icon: Tag, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Satılan Araçlar', value: counts.sold, icon: CheckSquare, tone: 'text-red-600 bg-red-50' },
    { label: 'Son 7 Gün Ziyaret', value: scans.value, icon: ScanLine, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Yeni Talepler', value: newLeads.value, icon: Inbox, tone: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Genel Bakış</h1>
          <p className="mt-1 text-sm text-slate-500">Hoş geldiniz, {profile.fullName}</p>
        </div>
        <ButtonLink href="/dashboard/vehicles/new">Yeni Araç Ekle</ButtonLink>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 px-4 py-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.tone}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500">{kpi.label}</p>
                <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Son Eklenen Araçlar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentVehicles.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              Henüz araç eklenmemiş.{' '}
              <Link href="/dashboard/vehicles/new" className="font-medium text-slate-900 underline">
                İlk aracınızı ekleyin
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentVehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link
                    href={`/dashboard/vehicles/${vehicle.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {vehicle.make} {vehicle.model} · {vehicle.year}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {vehicle.plate ?? 'Plaka yok'} · {new Intl.NumberFormat('tr-TR').format(vehicle.mileageKm)} km
                      </p>
                    </div>
                    <StatusBadge status={vehicle.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateVehicleStatus } from '@/app/dashboard/vehicles/actions';
import { STATUS_LABELS_TR, type VehicleStatus } from '@/lib/status-rules';
import { Select } from '@/components/ui/select';

export function StatusSelect({ vehicleId, status }: { vehicleId: string; status: VehicleStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      aria-label="Durum değiştir"
      className="h-8 w-auto text-xs"
      onChange={(event) => {
        const next = event.target.value as VehicleStatus;
        startTransition(async () => {
          await updateVehicleStatus(vehicleId, next);
          router.refresh();
        });
      }}
    >
      {(Object.keys(STATUS_LABELS_TR) as VehicleStatus[]).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS_TR[s]}
        </option>
      ))}
    </Select>
  );
}

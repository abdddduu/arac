'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteVehicle } from '@/app/dashboard/vehicles/actions';
import { Button } from '@/components/ui/button';

export function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (!window.confirm('Bu aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setError(null);
    startTransition(async () => {
      await deleteVehicle(vehicleId);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <Button variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
        <Trash2 className="h-4 w-4" />
        Sil
      </Button>
    </div>
  );
}

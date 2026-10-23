'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleStaffActive } from '@/app/dashboard/settings/actions';
import { Switch } from '@/components/ui/switch';

export function StaffToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(isActive);
  const [pending, setPending] = useState(false);

  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label="Personel durumu"
      onChange={(event) => {
        const next = event.target.checked;
        setChecked(next);
        setPending(true);
        void toggleStaffActive(userId, next).finally(() => {
          setPending(false);
          router.refresh();
        });
      }}
    />
  );
}

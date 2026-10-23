import { STATUS_LABELS_TR, type VehicleStatus } from '@/lib/status-rules';
import { Badge } from './badge';

const STATUS_VARIANT: Record<VehicleStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  draft: 'slate',
  active: 'green',
  reserved: 'amber',
  sold: 'red',
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS_TR[status]}</Badge>;
}

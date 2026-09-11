import { Badge } from '@/components/ui/badge';
import { LOT_STATUS_LABELS, RECEIPT_STATUS_LABELS } from '@/services/inbound/types';

const VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  processing: 'secondary',
  closed: 'outline',
  cancelled: 'destructive',
};

export function InboundStatusBadge({ status, kind = 'receipt' }: { status: string; kind?: 'receipt' | 'lot' }) {
  const labels = kind === 'lot' ? LOT_STATUS_LABELS : RECEIPT_STATUS_LABELS;
  return (
    <Badge variant={VARIANTS[status] ?? 'secondary'}>
      {(labels as Record<string, string>)[status] ?? status}
    </Badge>
  );
}

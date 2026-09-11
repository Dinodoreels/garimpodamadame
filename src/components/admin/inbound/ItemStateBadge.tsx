import { Badge } from '@/components/ui/badge';

const LABELS: Record<string, string> = {
  RECEIVED: 'Recebido', TRIAGE: 'Triagem', SCAN_PENDING: 'Pendente', IDENTIFIED: 'Identificado',
  QC_PENDING: 'Aguardando QC', QC_APPROVED: 'QC aprovado', PRICED: 'Precificado',
  ADDRESS_PENDING: 'Endereçado', STOCKED: 'No CD', AVAILABLE: 'Liberado', QUARANTINE: 'Quarentena', REJECTED: 'Reprovado',
};

export function ItemStateBadge({ state }: { state: string }) {
  const danger = state === 'REJECTED' || state === 'QUARANTINE';
  return <Badge variant={danger ? 'destructive' : state === 'AVAILABLE' ? 'default' : 'secondary'}>{LABELS[state] ?? state}</Badge>;
}
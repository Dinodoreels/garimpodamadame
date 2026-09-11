import { InboundComingSoon } from '@/components/admin/inbound/InboundComingSoon';

export function InboundScan() {
  return <InboundComingSoon title="Garimpo Scan" subtitle="Leitura rápida no galpão" phase="Fase 2" />;
}
export function InboundTriage() {
  return <InboundComingSoon title="Triagem" subtitle="Separação inicial dos produtos do lote" phase="Fase 2" />;
}
export function InboundPending() {
  return <InboundComingSoon title="Pendências" subtitle="Itens que precisam de decisão humana" phase="Fase 3" />;
}
export function InboundLabels() {
  return <InboundComingSoon title="Etiquetas" subtitle="Impressão térmica com QR Code" phase="Fase 9" />;
}

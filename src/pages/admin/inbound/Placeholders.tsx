import { InboundComingSoon } from '@/components/admin/inbound/InboundComingSoon';

export function InboundScan() {
  return <InboundComingSoon title="Garimpo Scan" subtitle="Leitura rápida no galpão" phase="Fase 2" />;
}
export function InboundTriage() {
  return <InboundComingSoon title="Triagem" subtitle="Separação inicial dos produtos do lote" phase="Fase 2" />;
}
export function InboundQC() {
  return <InboundComingSoon title="QC" subtitle="Controle de qualidade e condição" phase="Fase 4" />;
}
export function InboundIdentified() {
  return <InboundComingSoon title="Produtos identificados" subtitle="Produto master, variantes e SKUs" phase="Fase 3" />;
}
export function InboundPending() {
  return <InboundComingSoon title="Pendências" subtitle="Itens que precisam de decisão humana" phase="Fase 3" />;
}
export function InboundStock() {
  return <InboundComingSoon title="Estoque Inbound" subtitle="Unidades e movimentações" phase="Fase 5" />;
}
export function InboundLocations() {
  return <InboundComingSoon title="Endereçamento" subtitle="Mapa lógico do centro de distribuição" phase="Fase 5" />;
}
export function InboundLabels() {
  return <InboundComingSoon title="Etiquetas" subtitle="Impressão térmica com QR Code" phase="Fase 9" />;
}
export function InboundHistory() {
  return <InboundComingSoon title="Histórico" subtitle="Auditoria completa do módulo" phase="Fase 5" />;
}

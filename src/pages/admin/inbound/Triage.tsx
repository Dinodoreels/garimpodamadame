import InboundItems from './Items';

export default function InboundTriage() {
  return <InboundItems states={['RECEIVED', 'TRIAGE', 'SCAN_PENDING']} title="Triagem" subtitle="Itens aguardando leitura, identificação ou decisão humana" />;
}
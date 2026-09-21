import InboundItems from './Items';

export default function InboundTriage() {
  return <InboundItems states={['RECEIVED', 'TRIAGE', 'SCAN_PENDING', 'RETURNED', 'QUARANTINE']} title="Triagem" subtitle="Entradas, devoluções e quarentenas aguardando conferência" />;
}
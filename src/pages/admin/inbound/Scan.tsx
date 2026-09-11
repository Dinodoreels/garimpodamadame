import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ScanScreen } from '@/components/admin/inbound/ScanScreen';

export default function InboundScan() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Garimpo Scan"
        subtitle="Bipe o código ou tire a foto: a IA identifica e a peça entra no lote"
      />
      <ScanScreen />
    </div>
  );
}

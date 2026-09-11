import { Link } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Boxes, DollarSign, PackageSearch, Truck } from 'lucide-react';
import { useInboundDashboard } from '@/hooks/inbound/useInbound';
import { InboundStatusBadge } from '@/components/admin/inbound/InboundStatusBadge';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function InboundDashboard() {
  const { data, isLoading } = useInboundDashboard();

  const cards = [
    { icon: Truck, label: 'Carretas recebidas hoje', value: data?.trucksToday ?? 0 },
    { icon: Boxes, label: 'Lotes abertos', value: data?.openLotsCount ?? 0 },
    { icon: PackageSearch, label: 'Unidades estimadas hoje', value: data?.unitsToday ?? 0 },
    { icon: DollarSign, label: 'Valor recebido hoje', value: brl(data?.valueToday ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Inbound" subtitle="Entrada de mercadorias no centro de distribuição" />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(c => (
            <Card key={c.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <c.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-light mt-2">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Unidades pendentes de processamento</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-light">{data?.pendingUnits ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Soma das unidades ainda não processadas nos lotes abertos.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos recebimentos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)
          ) : (data?.recent.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
          ) : (
            data!.recent.map(r => {
              const expected = (r.lots || []).reduce((s, l) => s + (l.expected_units || 0), 0) || r.estimated_quantity;
              const processed = (r.lots || []).reduce((s, l) => s + (l.processed_units || 0), 0);
              const pct = expected > 0 ? Math.min(100, Math.round((processed / expected) * 100)) : 0;
              return (
                <Link key={r.id} to={`/admin/inbound/receipts/${r.id}`} className="block rounded-md border p-3 space-y-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{r.code}</span>
                    <InboundStatusBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{new Date(`${r.received_date}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                    <span>{r.origin_name || 'Origem não informada'}</span>
                    <span>{(r.lots || []).map(l => l.code).join(', ') || 'Sem lote'}</span>
                    <span>{r.estimated_quantity} un</span>
                  </div>
                  <Progress value={pct} />
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Qualidade, identificação, estoque e liberação usam apenas os registros reais do fluxo. Nenhum número é exibido sem dado real.
        </CardContent>
      </Card>
    </div>
  );
}

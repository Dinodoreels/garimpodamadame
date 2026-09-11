import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Boxes, Search } from 'lucide-react';
import { useLots, useUpdateLot } from '@/hooks/inbound/useInbound';
import { InboundStatusBadge } from '@/components/admin/inbound/InboundStatusBadge';
import { LOT_STATUS_LABELS } from '@/services/inbound/types';

export default function InboundLots() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const { data: lots = [], isLoading } = useLots({ search, status });
  const update = useUpdateLot();

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Lotes" subtitle="Lotes vinculados aos recebimentos" />

      <Card>
        <CardContent className="pt-6 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Código do lote" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              {Object.entries(LOT_STATUS_LABELS).map(([v, label]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : lots.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Boxes className="h-12 w-12 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
          <p>Nenhum lote encontrado</p>
          <p className="text-sm mt-1">Os lotes são criados junto com o recebimento da carreta.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lots.map(l => {
            const pct = l.expected_units > 0 ? Math.min(100, Math.round((l.processed_units / l.expected_units) * 100)) : 0;
            const closed = l.status === 'closed';
            return (
              <Card key={l.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{l.code}</span>
                    <InboundStatusBadge status={l.status} kind="lot" />
                  </div>
                  {l.truck_receipts && (
                    <Link to={`/admin/inbound/receipts/${l.truck_receipts.id}`} className="text-sm text-muted-foreground underline underline-offset-4">
                      {l.truck_receipts.code}
                    </Link>
                  )}
                  <div className="space-y-1">
                    <Progress value={pct} />
                    <p className="text-xs text-muted-foreground">
                      {l.processed_units} de {l.expected_units} unidades processadas ({pct}%)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        id: l.id,
                        status: closed ? 'open' : 'closed',
                        closed_at: closed ? null : new Date().toISOString(),
                      })
                    }
                  >
                    {closed ? 'Reabrir lote' : 'Fechar lote'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

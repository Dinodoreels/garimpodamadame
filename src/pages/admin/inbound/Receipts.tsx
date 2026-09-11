import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Truck } from 'lucide-react';
import { useReceipts } from '@/hooks/inbound/useInbound';
import { ReceiptDialog } from '@/components/admin/inbound/ReceiptDialog';
import { InboundStatusBadge } from '@/components/admin/inbound/InboundStatusBadge';
import { RECEIPT_STATUS_LABELS } from '@/services/inbound/types';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function InboundReceipts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: receipts = [], isLoading } = useReceipts({ search, status, from, to });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Recebimentos"
        subtitle="Entrada de carretas no centro de distribuição"
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo recebimento</Button>}
      />

      <Card>
        <CardContent className="pt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Código, origem, placa..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              {Object.entries(RECEIPT_STATUS_LABELS).map(([v, label]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Data inicial" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Data final" />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : receipts.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
          <p>Nenhum recebimento encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Registrar primeiro recebimento
          </Button>
        </CardContent></Card>
      ) : (
        <>
          {/* Celular */}
          <div className="space-y-3 md:hidden">
            {receipts.map(r => (
              <Card key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/inbound/receipts/${r.id}`)}>
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.code}</span>
                    <InboundStatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{r.origin_name || 'Origem não informada'}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{new Date(`${r.received_date}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                    <span>{r.estimated_quantity} un</span>
                    <span>{brl(Number(r.lot_value || 0))}</span>
                    <span>{r.lots?.length || 0} lote(s)</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tablet e desktop */}
          <Card className="hidden md:block">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Transportadora</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Lotes</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map(r => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/inbound/receipts/${r.id}`)}>
                      <TableCell className="font-medium">{r.code}</TableCell>
                      <TableCell>{new Date(`${r.received_date}T00:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{r.origin_name || '—'}</TableCell>
                      <TableCell>{r.carrier || '—'}</TableCell>
                      <TableCell className="text-right">{r.estimated_quantity}</TableCell>
                      <TableCell className="text-right">{brl(Number(r.lot_value || 0))}</TableCell>
                      <TableCell>{r.lots?.map(l => l.code).join(', ') || '—'}</TableCell>
                      <TableCell><InboundStatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <ReceiptDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

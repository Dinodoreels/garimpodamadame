import { useMemo } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertCircle } from 'lucide-react';
import { useConsignorItems, useConsignorPayments } from '@/hooks/useConsignorData';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConsignorSettlement() {
  const { data: items = [] } = useConsignorItems();
  const { data: payments = [], isLoading } = useConsignorPayments();

  const totals = useMemo(() => {
    const owed = items.reduce((s, i) => s + i.quantity_sold * i.unit_cost, 0);
    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { owed, paid, balance: owed - paid };
  }, [items, payments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-light tracking-wide">Acerto</h1>
        <p className="text-sm text-muted-foreground font-light mt-1">Quanto você tem a receber</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-muted p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total a Receber (acumulado)</p>
          <p className="text-2xl font-light mt-1">{formatCurrency(totals.owed)}</p>
        </div>
        <div className="bg-muted p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Pago</p>
          <p className="text-2xl font-light mt-1">{formatCurrency(totals.paid)}</p>
        </div>
        <div className={`p-4 ${totals.balance > 0 ? 'bg-green-500/10' : 'bg-muted'}`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo Atual</p>
          <p className="text-2xl font-light mt-1">{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">Histórico de Pagamentos</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum pagamento registrado ainda.</p>
          </div>
        ) : (
          <div className="border border-border rounded overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Período de Referência</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.payment_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.reference_period || '—'}</TableCell>
                    <TableCell className="text-sm">{p.payment_method || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.notes || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(p.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

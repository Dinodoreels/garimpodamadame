import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, ShoppingBag } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useConsignorSales } from '@/hooks/useConsignorData';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConsignorSales() {
  const [date, setDate] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const { data: sales = [], isLoading } = useConsignorSales(year, month);

  const totals = sales.reduce(
    (acc, s) => ({ qty: acc.qty + s.quantity, cost: acc.cost + s.total_cost, retail: acc.retail + s.total_price }),
    { qty: 0, cost: 0, retail: 0 }
  );

  const exportCSV = () => {
    const rows = [['Pedido', 'Data', 'Produto', 'Variante', 'Qtd', 'Preço Venda', 'Custo Unit.', 'Total Custo']];
    sales.forEach(s => {
      rows.push([
        s.order_number,
        format(new Date(s.paid_at), 'dd/MM/yyyy HH:mm'),
        s.product_title,
        s.variant_title || '',
        String(s.quantity),
        s.unit_price.toFixed(2),
        s.unit_cost.toFixed(2),
        s.total_cost.toFixed(2),
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vendas-${year}-${String(month).padStart(2, '0')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide">Vendas</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">Histórico de vendas das suas peças</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!sales.length}>
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(d => subMonths(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[180px] text-center capitalize">
          {format(date, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(d => addMonths(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Peças vendidas</p><p className="text-lg font-light">{totals.qty}</p></div>
        <div className="bg-muted p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total a Receber</p><p className="text-lg font-light">{formatCurrency(totals.cost)}</p></div>
        <div className="bg-muted p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento Loja</p><p className="text-lg font-light">{formatCurrency(totals.retail)}</p></div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
      ) : sales.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma venda neste mês.</p>
        </div>
      ) : (
        <div className="border border-border rounded overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Total a Receber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s, i) => (
                <TableRow key={`${s.order_id}-${i}`}>
                  <TableCell className="font-medium">{s.order_number}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(s.paid_at), 'dd/MM HH:mm')}</TableCell>
                  <TableCell>
                    {s.product_title}
                    {s.variant_title && <span className="text-muted-foreground text-xs ml-1">({s.variant_title})</span>}
                  </TableCell>
                  <TableCell className="text-right">{s.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.unit_cost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(s.total_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

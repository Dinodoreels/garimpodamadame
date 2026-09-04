import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConsignorItems } from '@/hooks/useConsignorData';
import { Package } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConsignorItems() {
  const { data: items = [], isLoading } = useConsignorItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-light tracking-wide">Minhas Peças</h1>
        <p className="text-sm text-muted-foreground font-light mt-1">Peças que você deixou em consignação</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma peça registrada.</p>
        </div>
      ) : (
        <div className="border border-border rounded overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Recebidas</TableHead>
                <TableHead className="text-right">Vendidas</TableHead>
                <TableHead className="text-right">Devolvidas</TableHead>
                <TableHead className="text-right">Em Estoque</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead>Recebimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.product_title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{i.variant_title || '—'}</TableCell>
                  <TableCell className="text-right">{i.quantity_received}</TableCell>
                  <TableCell className="text-right">{i.quantity_sold}</TableCell>
                  <TableCell className="text-right">{i.quantity_returned}</TableCell>
                  <TableCell className="text-right font-medium">{i.in_stock}</TableCell>
                  <TableCell className="text-right">{formatCurrency(i.unit_cost)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(i.received_at), 'dd/MM/yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

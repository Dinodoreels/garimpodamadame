import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer } from 'lucide-react';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const movementTypeLabels: Record<string, string> = {
  sale: 'Venda',
  withdrawal: 'Sangria',
  supply: 'Suprimento',
  adjustment: 'Ajuste',
};

interface Props {
  registerId: string | null;
  onClose: () => void;
}

export function RegisterHistoryDetailDialog({ registerId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['cash-register-detail', registerId],
    enabled: !!registerId,
    queryFn: async () => {
      const [{ data: register }, { data: movements }] = await Promise.all([
        supabase.from('cash_registers').select('*').eq('id', registerId!).single(),
        supabase.from('cash_movements').select('*').eq('register_id', registerId!).order('created_at', { ascending: true }),
      ]);
      const mov = (movements || []) as any[];
      const totals = {
        sales: mov.filter(m => m.type === 'sale').reduce((s, m) => s + Number(m.amount), 0),
        salesCount: mov.filter(m => m.type === 'sale').length,
        supplies: mov.filter(m => m.type === 'supply').reduce((s, m) => s + Number(m.amount), 0),
        withdrawals: mov.filter(m => m.type === 'withdrawal').reduce((s, m) => s + Number(m.amount), 0),
      };
      return { register, movements: mov, totals };
    },
  });

  const print = () => window.print();

  return (
    <Dialog open={!!registerId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-light">
            Detalhe do Caixa {data?.register ? format(new Date(data.register.opened_at), 'dd/MM/yyyy', { locale: ptBR }) : ''}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data?.register ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Abertura</p>
                <p className="text-base font-medium">{formatCurrency(data.register.opening_amount)}</p>
              </div>
              <div className="border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendas ({data.totals.salesCount})</p>
                <p className="text-base font-medium text-green-600 dark:text-green-400">{formatCurrency(data.totals.sales)}</p>
              </div>
              <div className="border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sangrias</p>
                <p className="text-base font-medium text-destructive">{formatCurrency(data.totals.withdrawals)}</p>
              </div>
              <div className="border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Suprimentos</p>
                <p className="text-base font-medium">{formatCurrency(data.totals.supplies)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Esperado</p>
                <p className="text-base font-medium">{formatCurrency(Number(data.register.expected_amount || 0))}</p>
              </div>
              <div className="border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fechamento</p>
                <p className="text-base font-medium">{formatCurrency(Number(data.register.closing_amount || 0))}</p>
                {data.register.difference != null && (
                  <p className={`text-xs mt-1 ${Number(data.register.difference) === 0 ? 'text-muted-foreground' : Number(data.register.difference) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    Diferença: {formatCurrency(Number(data.register.difference))}
                  </p>
                )}
              </div>
            </div>

            {data.register.next_day_opening_amount != null && (
              <div className="border border-primary/40 bg-primary/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reservado para Próxima Abertura</p>
                <p className="text-base font-medium text-primary">{formatCurrency(Number(data.register.next_day_opening_amount))}</p>
              </div>
            )}

            {data.register.notes && (
              <div className="bg-muted p-3 text-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Observações</p>
                <p>{data.register.notes}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Movimentações ({data.movements.length})</p>
              <div className="border border-border rounded overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.movements.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sem movimentações</TableCell></TableRow>
                    ) : data.movements.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{m.created_at ? format(new Date(m.created_at), 'HH:mm') : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={m.type === 'withdrawal' ? 'destructive' : m.type === 'supply' ? 'default' : 'secondary'} className="text-[10px]">
                            {movementTypeLabels[m.type] || m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.description || '-'}</TableCell>
                        <TableCell className={`text-right text-xs font-medium ${m.type === 'withdrawal' ? 'text-destructive' : ''}`}>
                          {m.type === 'withdrawal' ? '-' : '+'}{formatCurrency(Number(m.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={print}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCloseInventoryMonth } from '@/hooks/useInventoryClosing';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  year: number;
  month: number;
  storeId: string | null;
  totals: { units: number; cost_value: number; retail_value: number };
  monthLabel: string;
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function InventoryClosingDialog({ open, onOpenChange, year, month, storeId, totals, monthLabel }: Props) {
  const [notes, setNotes] = useState('');
  const closeMonth = useCloseInventoryMonth();

  const handleConfirm = async () => {
    await closeMonth.mutateAsync({ year, month, storeId, notes });
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-light">Fechar Estoque — {monthLabel}</DialogTitle>
          <DialogDescription>
            Será gerado um snapshot imutável da situação atual do estoque. Esta ação pode ser revertida apenas por um administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidades</p>
              <p className="text-lg font-light">{totals.units}</p>
            </div>
            <div className="bg-muted p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Custo</p>
              <p className="text-lg font-light">{formatCurrency(totals.cost_value)}</p>
            </div>
            <div className="bg-muted p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Venda</p>
              <p className="text-lg font-light">{formatCurrency(totals.retail_value)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs uppercase tracking-wider text-muted-foreground">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: inventário físico realizado, ajustes feitos..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={closeMonth.isPending} className="font-light">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={closeMonth.isPending} className="font-light">
            {closeMonth.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

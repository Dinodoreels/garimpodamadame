import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useUpdateStock } from '@/hooks/useProductAdmin';

interface StockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function StockDialog({ open, onOpenChange, product }: StockDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const updateStock = useUpdateStock();

  useEffect(() => {
    if (product?.variants) {
      const initial: Record<string, number> = {};
      product.variants.forEach(v => { initial[v.id] = v.inventory_quantity; });
      setQuantities(initial);
    }
  }, [product]);

  if (!product) return null;

  const handleSave = async () => {
    const updates = Object.entries(quantities).map(([variant_id, quantity]) => ({
      variant_id,
      quantity,
    }));
    await updateStock.mutateAsync({ productId: product.id, updates });
    onOpenChange(false);
  };

  const totalStock = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-light">
            <Package className="h-5 w-5" />
            Estoque — {product.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {product.variants.map((variant) => (
            <div key={variant.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{variant.title}</p>
                {variant.sku && <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>}
              </div>
              <Input
                type="number"
                min={0}
                value={quantities[variant.id] ?? 0}
                onChange={(e) => setQuantities(prev => ({
                  ...prev,
                  [variant.id]: parseInt(e.target.value) || 0,
                }))}
                className="w-24 text-center"
              />
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium">Total</span>
            <Badge variant={totalStock > 0 ? 'default' : 'destructive'}>
              {totalStock} unidades
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-light">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateStock.isPending} className="font-light">
            {updateStock.isPending ? 'Salvando...' : 'Salvar Estoque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

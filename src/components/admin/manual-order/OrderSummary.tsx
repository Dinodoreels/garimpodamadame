import { ManualOrderItem } from '@/hooks/useManualOrder';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface OrderSummaryProps {
  items: ManualOrderItem[];
  shippingCost: number;
  discountAmount: number;
  couponCode?: string;
  couponMessage?: string;
  pickupStoreName?: string;
}

export function OrderSummary({ items, shippingCost, discountAmount, couponCode, couponMessage, pickupStoreName }: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);
  const total = subtotal - discountAmount + shippingCost;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
      <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
        Resumo
      </h4>

      {/* Item list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <Package className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{item.product.title}</p>
                {item.variant.title !== 'Default' && (
                  <p className="text-xs text-muted-foreground">{item.variant.title}</p>
                )}
              </div>
              <span className="text-muted-foreground whitespace-nowrap">
                {item.quantity}x {formatCurrency(item.variant.price)}
              </span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'} no pedido
          </p>
        </div>
      )}

      <Separator />
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span className="flex items-center gap-1.5">
              Desconto
              {couponCode && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-300 text-green-600">
                  {couponCode}
                </Badge>
              )}
            </span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        {couponMessage && discountAmount > 0 && (
          <p className="text-xs text-green-600">{couponMessage}</p>
        )}
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Frete</span>
          <span>
            {pickupStoreName
              ? `Retirada — ${pickupStoreName}`
              : shippingCost > 0
                ? formatCurrency(shippingCost)
                : 'A calcular'
            }
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatCurrency(Math.max(0, total))}</span>
      </div>
    </div>
  );
}

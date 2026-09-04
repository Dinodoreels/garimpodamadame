import { useState } from "react";
import { Minus, Plus, Trash2, Bookmark, BookmarkCheck, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CartItem } from "@/stores/cartStore";

interface Props {
  items: CartItem[];
  formatPrice: (n: number, c?: string) => string;
  onUpdateQty: (variantId: string, qty: number) => void;
  onRemove: (variantId: string) => void;
  onRemoveKit: (kitId: string) => void;
  onToggleSaved: (variantId: string) => void;
}

export function CartItemsList({ items, formatPrice, onUpdateQty, onRemove, onRemoveKit, onToggleSaved }: Props) {
  const active = items.filter(i => !i.savedForLater);
  const saved = items.filter(i => i.savedForLater);
  const [showSaved, setShowSaved] = useState(true);

  // Group active items by kitId
  const groups = new Map<string | null, CartItem[]>();
  for (const item of active) {
    const key = item.kitId || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([kitId, kitItems]) => {
        if (kitId) {
          const total = kitItems.reduce(
            (s, it) => s + (it.kitUnitPrice ?? it.variant.price) * it.quantity,
            0
          );
          return (
            <div key={kitId} className="border border-chrome/30 rounded-lg overflow-hidden bg-chrome/5">
              <div className="flex items-center justify-between px-3 py-2 bg-chrome/10 border-b border-chrome/20">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-chrome flex-shrink-0" />
                  <Badge variant="secondary" className="text-[10px] tracking-widest bg-foreground text-background">KIT</Badge>
                  <span className="text-sm font-medium truncate">{kitItems[0].kitTitle || 'Kit'}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover kit?</AlertDialogTitle>
                      <AlertDialogDescription>Todos os itens deste kit serão removidos do carrinho.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRemoveKit(kitId)} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="p-2 space-y-2">
                {kitItems.map((item) => (
                  <ItemRow
                    key={item.variant.id}
                    item={item}
                    formatPrice={formatPrice}
                    onUpdateQty={onUpdateQty}
                    onRemove={onRemove}
                    onToggleSaved={onToggleSaved}
                    compact
                  />
                ))}
                <div className="flex justify-between text-xs px-2 pt-1 border-t border-chrome/20">
                  <span className="text-muted-foreground">Total do kit</span>
                  <span className="font-semibold text-chrome">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div key="standalone" className="space-y-3">
            {kitItems.map((item) => (
              <ItemRow
                key={item.variant.id}
                item={item}
                formatPrice={formatPrice}
                onUpdateQty={onUpdateQty}
                onRemove={onRemove}
                onToggleSaved={onToggleSaved}
              />
            ))}
          </div>
        );
      })}

      {saved.length > 0 && (
        <div className="border-t pt-3">
          <button
            onClick={() => setShowSaved((v) => !v)}
            className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition mb-2"
          >
            <span className="tracking-luxury">SALVOS PARA DEPOIS ({saved.length})</span>
            <ChevronDown className={`h-3 w-3 transition ${showSaved ? '' : '-rotate-90'}`} />
          </button>
          {showSaved && (
            <div className="space-y-2 opacity-80">
              {saved.map((item) => (
                <ItemRow
                  key={item.variant.id}
                  item={item}
                  formatPrice={formatPrice}
                  onUpdateQty={onUpdateQty}
                  onRemove={onRemove}
                  onToggleSaved={onToggleSaved}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  formatPrice,
  onUpdateQty,
  onRemove,
  onToggleSaved,
  compact,
}: {
  item: CartItem;
  formatPrice: (n: number, c?: string) => string;
  onUpdateQty: (variantId: string, qty: number) => void;
  onRemove: (variantId: string) => void;
  onToggleSaved: (variantId: string) => void;
  compact?: boolean;
}) {
  const unitPrice = item.kitUnitPrice ?? item.variant.price;
  return (
    <div className={`flex gap-3 ${compact ? 'p-2' : 'p-3'} bg-secondary/50 rounded-lg`}>
      <div className={`${compact ? 'w-14 h-14' : 'w-20 h-20 sm:w-16 sm:h-16'} bg-muted rounded-md overflow-hidden flex-shrink-0`}>
        {item.product.images?.[0] && (
          <img src={item.product.images[0].url} alt={item.product.title} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate text-sm">{item.product.title}</h4>
        {item.variant.title !== 'Default' && (
          <p className="text-xs text-muted-foreground">
            {[item.variant.option1, item.variant.option2, item.variant.option3].filter(Boolean).join(' • ')}
          </p>
        )}
        <div className="flex items-baseline gap-2 mt-1">
          <p className="font-semibold text-chrome text-sm">{formatPrice(unitPrice)}</p>
          {item.kitUnitPrice != null && item.kitUnitPrice < item.variant.price && (
            <p className="text-[10px] text-muted-foreground line-through">{formatPrice(item.variant.price)}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onToggleSaved(item.variant.id)}
            title={item.savedForLater ? 'Mover para o carrinho' : 'Salvar para depois'}
          >
            {item.savedForLater ? <BookmarkCheck className="h-3.5 w-3.5 text-chrome" /> : <Bookmark className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.variant.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {!item.kitId && !item.savedForLater && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onUpdateQty(item.variant.id, item.quantity - 1)}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onUpdateQty(item.variant.id, item.quantity + 1)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {item.kitId && (
          <span className="text-[10px] text-muted-foreground">qtd {item.quantity}</span>
        )}
      </div>
    </div>
  );
}
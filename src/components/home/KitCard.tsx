import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProductKit } from '@/hooks/useKits';

const formatPrice = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function getKitPricing(kit: ProductKit) {
  const items = (kit as any).product_kit_items || [];
  const fullPrice = items.reduce((sum: number, it: any) => {
    const p = it.products?.price || 0;
    return sum + p * (it.quantity || 1);
  }, 0);
  let finalPrice = fullPrice;
  if (kit.pricing_type === 'fixed' && kit.fixed_price != null) {
    finalPrice = kit.fixed_price;
  } else if (kit.pricing_type === 'discount' && kit.discount_percent != null) {
    finalPrice = fullPrice * (1 - kit.discount_percent / 100);
  }
  const savings = Math.max(0, fullPrice - finalPrice);
  const savingsPercent = fullPrice > 0 ? Math.round((savings / fullPrice) * 100) : 0;
  return { fullPrice, finalPrice, savings, savingsPercent };
}

interface KitCardProps {
  kit: ProductKit;
}

export function KitCard({ kit }: KitCardProps) {
  const { fullPrice, finalPrice, savingsPercent } = getKitPricing(kit);
  const cover = kit.image_url || (kit as any).product_kit_items?.[0]?.products?.product_images?.[0]?.url;
  const itemCount = ((kit as any).product_kit_items || []).length;

  return (
    <Link
      to={`/kits/${kit.handle}`}
      className="group block relative overflow-hidden bg-secondary/30 hover:bg-secondary/50 transition-colors"
    >
      <div className="aspect-[9/16] sm:aspect-[3/4] bg-muted relative overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={kit.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-40" strokeWidth={1.2} />
          </div>
        )}
        <Badge className="absolute top-2 left-2 bg-foreground text-background text-[10px] tracking-widest">
          KIT
        </Badge>
        {savingsPercent > 0 && (
          <Badge className="absolute top-2 right-2 bg-chrome text-white text-[10px]">
            -{savingsPercent}%
          </Badge>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-[10px] tracking-luxury text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'PEÇA' : 'PEÇAS'}
        </p>
        <h3 className="font-display text-sm sm:text-base font-light tracking-wide line-clamp-2 min-h-[2.5em]">
          {kit.title}
        </h3>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-semibold text-chrome">{formatPrice(finalPrice)}</span>
          {fullPrice > finalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(fullPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
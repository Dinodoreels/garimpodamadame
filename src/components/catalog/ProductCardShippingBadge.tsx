import { useEffect, useRef, useState } from 'react';
import { Truck, Loader2 } from 'lucide-react';
import { useProductShippingEstimate } from '@/hooks/useCatalogShippingCep';

interface ProductCardShippingBadgeProps {
  productId: string;
  unitPrice: number;
  cleanCep: string;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

export function ProductCardShippingBadge({
  productId,
  unitPrice,
  cleanCep,
}: ProductCardShippingBadgeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Lazy: only fetch once the card has been on screen
  useEffect(() => {
    if (!ref.current || visible) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visible]);

  const { data, isLoading } = useProductShippingEstimate({
    productId,
    cleanCep,
    subtotal: unitPrice,
    enabled: visible,
  });

  if (cleanCep.length !== 8) return null;

  // Find cheapest available option
  const cheapest = data?.options?.[0];
  const isFree = cheapest?.is_free;

  return (
    <div
      ref={ref}
      className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-h-[18px]"
    >
      {isLoading && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>calculando frete...</span>
        </>
      )}
      {!isLoading && cheapest && (
        <>
          <Truck className="h-3 w-3" />
          {isFree ? (
            <span className="text-green-600 font-medium">FRETE GRÁTIS · {cheapest.estimated_text}</span>
          ) : (
            <span>
              Frete a partir de{' '}
              <span className="font-medium text-foreground">{formatPrice(cheapest.cost)}</span>
              {' · '}
              {cheapest.estimated_text}
            </span>
          )}
        </>
      )}
      {!isLoading && !cheapest && data === null && (
        <span className="text-muted-foreground/70">Frete indisponível</span>
      )}
    </div>
  );
}
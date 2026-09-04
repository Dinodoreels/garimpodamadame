import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface ProductCarouselProps {
  products: Product[];
  isLoading?: boolean;
}

export function ProductCarousel({ products, isLoading }: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      {/* Navigation Arrows - Desktop only */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 z-10",
          "hidden md:flex h-10 w-10 rounded-full",
          "bg-background/80 backdrop-blur-sm border-border/50",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "hover:bg-background hover:border-foreground/20",
          !canScrollPrev && "invisible"
        )}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute -right-4 lg:-right-6 top-1/2 -translate-y-1/2 z-10",
          "hidden md:flex h-10 w-10 rounded-full",
          "bg-background/80 backdrop-blur-sm border-border/50",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "hover:bg-background hover:border-foreground/20",
          !canScrollNext && "invisible"
        )}
        onClick={scrollNext}
        disabled={!canScrollNext}
      >
        <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
      </Button>

      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4 lg:-ml-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="pl-4 lg:pl-6 min-w-0 flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

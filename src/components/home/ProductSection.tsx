import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCarousel } from './ProductCarousel';
import { Product } from '@/hooks/useProducts';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isLoading?: boolean;
  linkTo?: string;
  linkText?: string;
}

export function ProductSection({
  title,
  subtitle,
  products,
  isLoading,
  linkTo,
  linkText = 'VER TUDO',
}: ProductSectionProps) {
  // Don't render if no products and not loading
  if (!isLoading && (!products || products.length === 0)) {
    return null;
  }

  return (
    <section className="py-6 lg:py-16 border-t border-border/50">
      <div className="container">
        <div className="text-center mb-4 lg:mb-12">
          {subtitle && (
            <p className="text-xs tracking-luxury text-muted-foreground mb-2 lg:mb-4">
              {subtitle}
            </p>
          )}
          <h2 className="font-display text-xl lg:text-3xl font-light tracking-wide">
            {title}
          </h2>
        </div>

        <ProductCarousel products={products} isLoading={isLoading} />

        {linkTo && (
          <div className="text-center mt-8 lg:mt-12">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-foreground/20 hover:bg-foreground hover:text-background tracking-wider text-xs px-8 min-h-[48px] transition-all duration-300 hover:scale-105"
            >
              <Link to={linkTo}>
                {linkText}
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

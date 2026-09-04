import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveKits } from '@/hooks/useKits';
import { KitCard } from './KitCard';

export function KitsSection() {
  const { data: kits = [], isLoading } = useActiveKits();

  if (!isLoading && kits.length === 0) return null;

  return (
    <section className="py-6 lg:py-16 border-t border-border/50">
      <div className="container">
        <div className="text-center mb-4 lg:mb-12">
          <p className="text-xs tracking-luxury text-muted-foreground mb-2 lg:mb-4">
            COMBOS ESPECIAIS
          </p>
          <h2 className="font-display text-xl lg:text-3xl font-light tracking-wide">
            Kits & Combos
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
            {kits.slice(0, 8).map((kit) => (
              <KitCard key={kit.id} kit={kit} />
            ))}
          </div>
        )}

        {kits.length > 4 && (
          <div className="text-center mt-8 lg:mt-12">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-foreground/20 hover:bg-foreground hover:text-background tracking-wider text-xs px-8 min-h-[48px]"
            >
              <Link to="/kits">
                VER TODOS OS KITS
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
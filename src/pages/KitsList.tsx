import { Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useActiveKits } from '@/hooks/useKits';
import { KitCard } from '@/components/home/KitCard';

export default function KitsList() {
  const { data: kits = [], isLoading } = useActiveKits();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0 container py-8 lg:py-12">
        <div className="text-center mb-8 lg:mb-12">
          <p className="text-xs tracking-luxury text-muted-foreground mb-2">COMBOS ESPECIAIS</p>
          <h1 className="font-display text-2xl lg:text-4xl font-light tracking-wide">
            Kits & Combos
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Combinações exclusivas com preços especiais.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : kits.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">Nenhum kit disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
            {kits.map((kit) => (
              <KitCard key={kit.id} kit={kit} />
            ))}
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
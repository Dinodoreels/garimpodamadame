import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { toast } from 'sonner';

export default function Favorites() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading: favoritesLoading, removeFavorite } = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleRemoveFavorite = async (productId: string) => {
    const { error } = await removeFavorite(productId);
    if (error) {
      toast.error('Erro ao remover favorito');
    } else {
      toast.success('Removido dos favoritos');
    }
  };

  const formatPrice = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(amount);
  };

  if (authLoading || favoritesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-chrome" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-secondary/30 pb-16 md:pb-0">
        <div className="container py-8">
          <h1 className="font-display text-2xl lg:text-3xl font-light tracking-wide mb-6">
            Meus Favoritos
          </h1>

          {favorites.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-lg font-semibold mb-2">
                  Sua lista de favoritos está vazia
                </h2>
                <p className="text-muted-foreground mb-6">
                  Adicione produtos aos favoritos para encontrá-los facilmente depois
                </p>
                <Button asChild className="bg-foreground hover:bg-foreground/90 text-background min-h-[48px]">
                  <Link to="/catalog">Explorar Produtos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {favorites.map((favorite) => (
                <Card key={favorite.id} className="group overflow-hidden hover-lift">
                  <Link to={`/product/${favorite.product_handle}`}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {favorite.product_image ? (
                        <img
                          src={favorite.product_image}
                          alt={favorite.product_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFavorite(favorite.product_id || favorite.shopify_product_id);
                        }}
                        className="absolute top-3 right-3 p-2.5 rounded-full bg-background/80 backdrop-blur-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Heart className="h-5 w-5 fill-current" />
                      </button>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-chrome transition-colors">
                        {favorite.product_title}
                      </h3>
                      {favorite.product_price && (
                        <span className="font-semibold text-lg text-chrome">
                          {formatPrice(favorite.product_price, favorite.currency_code)}
                        </span>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
      
    </div>
  );
}

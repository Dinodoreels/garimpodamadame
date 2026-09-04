import { Link } from 'react-router-dom';
import { Heart, Loader2, ShoppingBag } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ProductCardShippingBadge } from '@/components/catalog/ProductCardShippingBadge';

interface ProductCardProps {
  product: Product;
  shippingCep?: string;
}

export function ProductCard({ product, shippingCep }: ProductCardProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addItem } = useCartStore();
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAdded, setShowAdded] = useState(false);
  const navigate = useNavigate();
  
  const mainImage = product.images?.[0];
  const secondImage = product.images?.[1];
  const firstVariant = product.variants?.[0];
  const price = product.price;
  const compareAtPrice = product.compare_at_price;
  // Check availability: in stock (qty > 0) or on-request (policy=continue)
  const hasAnyAvailableVariant = product.variants?.some(v => 
    v.inventory_quantity > 0 || v.inventory_policy === 'continue'
  );
  const isAvailable = hasAnyAvailableVariant ?? product.is_available;
  const isOnRequest = isAvailable && product.variants?.every(v => v.inventory_quantity === 0);
  const productIsFavorite = isFavorite(product.id);

  // Check if product is new (within 7 days)
  const isNew = () => {
    const createdAt = new Date(product.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Check if product has discount
  const hasDiscount = compareAtPrice && compareAtPrice > price;
  const discountPercent = hasDiscount 
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) 
    : 0;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Faça login para adicionar favoritos', {
        position: 'top-center',
        action: {
          label: 'Entrar',
          onClick: () => navigate('/auth')
        }
      });
      return;
    }
    
    setFavoriteLoading(true);
    const { error } = await toggleFavorite(product);
    setFavoriteLoading(false);
    
    if (error) {
      toast.error('Erro ao atualizar favoritos', { position: 'top-center' });
    } else {
      toast.success(productIsFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos', {
        position: 'top-center'
      });
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!firstVariant || !isAvailable) return;
    
    setIsAdding(true);
    
    addItem({
      product,
      variant: firstVariant,
      quantity: 1
    });
    
    // Show checkmark animation
    setTimeout(() => {
      setIsAdding(false);
      setShowAdded(true);
      toast.success('Adicionado ao carrinho', {
        description: product.title,
        position: 'top-center'
      });
      
      setTimeout(() => setShowAdded(false), 1500);
    }, 300);
  };

  return (
    <div className="group relative">
      <Link to={`/product/${product.handle}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary/30 mb-4 transition-all duration-300 group-hover:shadow-lg">
          {mainImage ? (
            <>
              <img
                src={mainImage.url}
                alt={mainImage.alt_text || product.title}
                className={cn(
                  "w-full h-full object-cover transition-all duration-500",
                  secondImage && "group-hover:opacity-0 group-hover:scale-105"
                )}
              />
              {secondImage && (
                <img
                  src={secondImage.url}
                  alt={secondImage.alt_text || product.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-500 scale-105 group-hover:scale-100"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              Sem imagem
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {isNew() && (
              <Badge className="bg-foreground text-background text-[10px] tracking-wider px-2 py-0.5 rounded-none">
                NOVO
              </Badge>
            )}
            {hasDiscount && (
              <Badge className="bg-red-500 text-white text-[10px] tracking-wider px-2 py-0.5 rounded-none">
                -{discountPercent}%
              </Badge>
            )}
          </div>
          
          {/* Favorite button */}
          <button
            onClick={handleFavoriteToggle}
            disabled={favoriteLoading}
            className={cn(
              "absolute top-3 right-3 p-2.5 transition-all duration-200 rounded-full",
              "hover:bg-background/80 backdrop-blur-sm",
              productIsFavorite 
                ? "opacity-100 text-foreground" 
                : "opacity-0 group-hover:opacity-100 text-foreground/60 hover:text-foreground",
              "disabled:opacity-50 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            )}
          >
            {favoriteLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Heart 
                className={cn(
                  "h-5 w-5 transition-transform",
                  productIsFavorite && "fill-current animate-pulse"
                )} 
                strokeWidth={1.5} 
              />
            )}
          </button>

          {/* Quick Add Button (Desktop only) */}
          {isAvailable && (
            <button
              onClick={handleQuickAdd}
              disabled={isAdding || showAdded}
              className={cn(
                "absolute bottom-3 left-3 right-3 py-3 px-4",
                "bg-background/95 backdrop-blur-sm text-foreground",
                "text-xs tracking-wider font-medium",
                "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
                "transition-all duration-300 hidden md:flex items-center justify-center gap-2",
                "hover:bg-foreground hover:text-background",
                "disabled:opacity-50 min-h-[44px]"
              )}
            >
              {showAdded ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  ADICIONADO
                </>
              ) : isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  ADICIONAR
                </>
              )}
            </button>
          )}
          
          {!isAvailable && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-xs tracking-wider text-muted-foreground">
                ESGOTADO
              </span>
            </div>
          )}
          {isOnRequest && (
            <Badge className="absolute bottom-3 left-3 bg-secondary text-secondary-foreground text-[10px] tracking-wider px-2 py-0.5 rounded-none">
              SOB ENCOMENDA
            </Badge>
          )}
        </div>
        
        <div className="space-y-1.5">
          {/* Title */}
          <h3 className="text-sm font-light line-clamp-1 group-hover:opacity-70 transition-opacity">
            {product.title}
          </h3>
          
          {/* Price */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {formatPrice(price)}
            </p>
            {hasDiscount && (
              <p className="text-xs text-muted-foreground line-through">
                {formatPrice(compareAtPrice)}
              </p>
            )}
          </div>

          {/* Shipping estimate (when CEP is set on catalog) */}
          {shippingCep && shippingCep.replace(/\D/g, '').length === 8 && isAvailable && (
            <ProductCardShippingBadge
              productId={product.id}
              unitPrice={price}
              cleanCep={shippingCep.replace(/\D/g, '')}
            />
          )}
        </div>
      </Link>
    </div>
  );
}

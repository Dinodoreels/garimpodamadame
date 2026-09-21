import { useState, useMemo, useRef, useEffect } from 'react';
import { BuyNowModal } from '@/components/cart/BuyNowModal';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Minus, Plus, ShoppingCart, Check, X, Heart, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

import { useProductByHandle, useProducts } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cartStore';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Product, ProductVariant } from '@/hooks/useProducts';
import { ProductReviews } from '@/components/products/ProductReviews';
import { ProductSection } from '@/components/home/ProductSection';
import { ProductShippingEstimate } from '@/components/product/ProductShippingEstimate';
import { useProductCategories } from '@/hooks/useProductCategories';
import { getDaysToExpiry, getExpiryStatus, formatDateBR } from '@/lib/expiry';
import { applySeoMetadata } from '@/components/seo/RouteSeo';

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProductByHandle(handle || '');
  const { data: categories } = useProductCategories();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addItem } = useCartStore();
  
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [buyNowModalOpen, setBuyNowModalOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!product) return;
    touchEndX.current = e.changedTouches[0].clientX;
    const delta = touchStartX.current - touchEndX.current;
    const imgs = product.images || [];
    if (imgs.length > 1 && Math.abs(delta) > 50) {
      if (delta > 0) {
        setSelectedImageIndex((prev) => (prev + 1) % imgs.length);
      } else {
        setSelectedImageIndex((prev) => (prev - 1 + imgs.length) % imgs.length);
      }
    }
  };
  const { data: allProducts, isLoading: productsLoading } = useProducts(12);

  const productIsFavorite = product ? isFavorite(product.id) : false;

  useEffect(() => {
    if (!product) return;
    const description = product.seo_description?.trim() || product.description?.trim().slice(0, 160) || `Conheça ${product.title} no O Garimpo Digital.`;
    applySeoMetadata(
      product.seo_title?.trim() || `${product.title} | O Garimpo Digital`,
      description,
      `/product/${product.handle}`,
      product.social_image_url || product.images?.[0]?.url,
    );

    const variants = product.variants || [];
    const prices = variants.map(variant => Number(variant.price)).filter(Number.isFinite);
    const price = prices.length > 0 ? Math.min(...prices) : Number(product.price);
    const available = variants.some(variant => variant.inventory_quantity > 0 || variant.inventory_policy === 'continue');
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: (product.images || []).map(image => image.url),
      description,
      sku: variants.find(variant => variant.sku)?.sku || undefined,
      brand: product.vendor ? { '@type': 'Brand', name: product.vendor } : undefined,
      offers: {
        '@type': 'Offer',
        url: `https://ogarimpodigital.com.br/product/${product.handle}`,
        priceCurrency: 'BRL',
        price: price.toFixed(2),
        availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    };
    let script = document.head.querySelector<HTMLScriptElement>("script[data-seo='product']");
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seo = 'product';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => script?.remove();
  }, [product]);

  // Initialize selected options when product loads
  useMemo(() => {
    if (product?.options) {
      const initial: Record<string, string> = {};
      product.options.forEach(option => {
        if (option.values[0]) {
          initial[option.name] = option.values[0];
        }
      });
      setSelectedOptions(initial);
    }
  }, [product]);

  // Find selected variant
  const selectedVariant = useMemo((): ProductVariant | null => {
    if (!product || !product.variants || product.variants.length === 0) return null;
    
    // If no options selected, return first variant
    if (Object.keys(selectedOptions).length === 0) {
      return product.variants[0];
    }
    
    // Find variant matching selected options
    return product.variants.find(v => {
      const variantOptions = [v.option1, v.option2, v.option3].filter(Boolean);
      const selectedValues = Object.values(selectedOptions);
      return selectedValues.every(val => variantOptions.includes(val));
    }) || product.variants[0];
  }, [product, selectedOptions]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    
    addItem({
      product,
      variant: selectedVariant,
      quantity
    });
    
    toast.success('Adicionado ao carrinho', {
      description: `${quantity}x ${product.title}`,
      position: 'top-center'
    });
  };

  const handleBuyNow = () => {
    if (!product || !selectedVariant) return;
    
    if (!user) {
      toast.error('Faça login para comprar', {
        position: 'top-center',
        action: {
          label: 'Entrar',
          onClick: () => navigate('/auth')
        }
      });
      return;
    }
    
    setBuyNowModalOpen(true);
  };

  const buyNowItem = product && selectedVariant ? {
    product,
    variant: selectedVariant,
    quantity,
  } : null;

  const handleFavoriteToggle = async () => {
    if (!product) return;
    
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <Button asChild>
            <Link to="/catalog">Voltar ao Catálogo</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const images = product.images || [];
  const stockAvailable = selectedVariant ? (selectedVariant.inventory_quantity > 0 || (selectedVariant as any).inventory_policy === 'continue') : false;
  const isOnRequest = stockAvailable && selectedVariant && selectedVariant.inventory_quantity === 0;

  // Expiry computation for the selected variant (variant date wins, falls back to product)
  const variantExpiry = selectedVariant?.expiry_date || product.expiry_date || null;
  const category = categories?.find((c) => c.value === product.product_type);
  const alertDays = category?.expiry_alert_days ?? 60;
  const expiryDays = getDaysToExpiry(variantExpiry);
  const expiryStatus = getExpiryStatus(variantExpiry, alertDays);
  const isExpired = expiryStatus === 'expired';
  const isAvailable = stockAvailable && !isExpired;
  const compareAtPrice = selectedVariant?.compare_at_price ?? product.compare_at_price;
  const hasDiscount = Boolean(compareAtPrice && selectedVariant && compareAtPrice > selectedVariant.price);
  const discountPercent = hasDiscount && compareAtPrice && selectedVariant
    ? Math.round(((compareAtPrice - selectedVariant.price) / compareAtPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      
      <main className="flex-1 pb-24 md:pb-0">
        <div className="container py-0 md:py-4 lg:py-8">
          {/* Breadcrumb - hidden on mobile */}
          <Link 
            to="/catalog" 
            className="hidden md:inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar ao Catálogo
          </Link>

          <div className="grid lg:grid-cols-2 gap-1 md:gap-6 lg:gap-12">
            {/* Images */}
            <div className="space-y-2 md:space-y-4">
              <div
                className="-mx-4 md:mx-0 aspect-[3/4] md:aspect-square bg-muted md:rounded-lg overflow-hidden relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {images[selectedImageIndex] ? (
                  <img
                    src={images[selectedImageIndex].url}
                    alt={images[selectedImageIndex].alt_text || product.title}
                    className="w-full h-full object-cover transition-all duration-300"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Sem imagem
                  </div>
                )}
                
                {/* Gradient overlay with title/price on mobile */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pb-5 md:hidden">
                  <div className="font-display text-base font-bold text-white leading-tight line-clamp-2 mb-0.5">
                    {product.title}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gold">
                      {selectedVariant && formatPrice(selectedVariant.price)}
                    </span>
                    {hasDiscount && compareAtPrice && (
                      <span className="text-xs text-background/80 line-through">{formatPrice(compareAtPrice)}</span>
                    )}
                  </div>
                </div>

                {/* Dot indicators on mobile */}
                {images.length > 1 && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors touch-manipulation ${
                          selectedImageIndex === index ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Favorite button */}
                <button
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                  aria-label={productIsFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  className={`absolute top-4 right-4 p-3 rounded-full bg-background/80 backdrop-blur-sm transition-colors ${
                    productIsFavorite ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                  } disabled:opacity-50`}
                >
                  {favoriteLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Heart className={`h-6 w-6 ${productIsFavorite ? 'fill-current' : ''}`} />
                  )}
                </button>
              </div>
              
              {/* Thumbnails - desktop only */}
              {images.length > 1 && (
                <div className="hidden md:flex gap-2 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors touch-manipulation ${
                        selectedImageIndex === index ? 'border-gold' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.alt_text || `${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-1.5 md:space-y-4 lg:space-y-6 min-w-0 overflow-hidden">
              {/* Title & price - hidden on mobile (shown in image overlay) */}
              <div className="hidden md:block">
                <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2 leading-tight line-clamp-2">
                  {product.title}
                </h1>
                
                {hasDiscount && compareAtPrice && (
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground line-through">De {formatPrice(compareAtPrice)}</span>
                    <Badge variant="destructive">-{discountPercent}%</Badge>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-2xl lg:text-3xl font-bold text-gold">
                    {selectedVariant && `${hasDiscount ? 'Por ' : ''}${formatPrice(selectedVariant.price)}`}
                  </span>
                  
                  <Badge variant={isAvailable ? "secondary" : "destructive"}>
                    {isOnRequest ? (
                      <><Check className="h-3 w-3 mr-1" /> A pedir</>
                    ) : isAvailable ? (
                      <><Check className="h-3 w-3 mr-1" /> Em estoque</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Esgotado</>
                    )}
                  </Badge>
                  {isExpired && (
                    <Badge variant="destructive">VENCIDO</Badge>
                  )}
                  {!isExpired && expiryStatus === 'expiring' && (
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                      Vence em {expiryDays}d
                    </Badge>
                  )}
                </div>
                {variantExpiry && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Validade: {formatDateBR(variantExpiry)}
                    {expiryStatus === 'expiring' && expiryDays !== null && ` — vence em ${expiryDays} dia(s)`}
                    {expiryStatus === 'expired' && ' — produto vencido'}
                  </p>
                )}
              </div>

              {/* Mobile compact: just badge */}
              <div className="flex items-center gap-2 md:hidden">
                <Badge variant={isAvailable ? "secondary" : "destructive"}>
                  {isOnRequest ? (
                    <><Check className="h-3 w-3 mr-1" /> A pedir</>
                  ) : isAvailable ? (
                    <><Check className="h-3 w-3 mr-1" /> Em estoque</>
                  ) : (
                    <><X className="h-3 w-3 mr-1" /> Esgotado</>
                  )}
                </Badge>
                {isExpired && <Badge variant="destructive">VENCIDO</Badge>}
                {!isExpired && expiryStatus === 'expiring' && (
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                    Vence em {expiryDays}d
                  </Badge>
                )}
              </div>

              {/* Options */}
              {product.options.map((option) => {
                if (option.values.length <= 1) return null;
                
                const isValueAvailable = (value: string) =>
                  product.variants.some(v =>
                    [v.option1, v.option2, v.option3].includes(value) &&
                    (v.inventory_quantity > 0 || v.inventory_policy === 'continue')
                  );

                return (
                  <div key={option.name}>
                    <label className="block text-sm font-medium mb-2">
                      {option.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const available = isValueAvailable(value);
                        const selected = selectedOptions[option.name] === value;
                        return (
                          <button
                            key={value}
                            onClick={() => available && setSelectedOptions({ ...selectedOptions, [option.name]: value })}
                            disabled={!available}
                            className={`px-4 py-2 min-w-[44px] min-h-[44px] rounded-md border text-sm transition-colors touch-manipulation ${
                              !available
                                ? 'border-border/50 text-muted-foreground/40 line-through cursor-not-allowed opacity-50'
                                : selected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-border hover:border-gold'
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-1 md:mb-2">
                  Quantidade
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Actions - mobile inline */}
              <div className="md:hidden space-y-2 pt-2 pb-4 max-w-full overflow-hidden">
                <Button 
                  onClick={handleAddToCart}
                  disabled={!isAvailable}
                  variant="outline"
                  className="w-full h-11"
                  size="default"
                >
                  <ShoppingCart className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Adicionar ao Carrinho</span>
                </Button>
                
                <Button 
                  onClick={handleBuyNow}
                  disabled={!isAvailable}
                  className="w-full h-12 bg-chrome hover:bg-chrome-dark text-white touch-manipulation overflow-hidden"
                  size="lg"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Comprar Agora
                </Button>
                
              </div>

              {/* Actions - desktop */}
              <div className="hidden md:block space-y-3 pt-2 pb-6 max-w-full overflow-hidden">
                <Button 
                  onClick={handleAddToCart}
                  disabled={!isAvailable}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                >
                  <ShoppingCart className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">Adicionar ao Carrinho</span>
                </Button>
                
                <Button 
                  onClick={handleBuyNow}
                  disabled={!isAvailable}
                  className="w-full h-14 bg-chrome hover:bg-chrome-dark text-white touch-manipulation overflow-hidden"
                  size="lg"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Comprar Agora
                </Button>
                
              </div>

              {/* Shipping Estimate (mobile + desktop) */}
              <div className="pt-1 pb-4 max-w-full overflow-hidden">
                <ProductShippingEstimate
                  productId={product.id}
                  unitPrice={product.price}
                  quantity={quantity}
                />
              </div>

            </div>
          </div>

          {/* Description - outside grid to avoid overflow */}
          {product.description && (
            <div className="mt-4 pt-2 md:pt-6 border-t w-full overflow-hidden max-w-[100vw]">
              <h2 className="text-sm md:text-base font-semibold mb-1 md:mb-2">Descrição</h2>
              <p className="text-muted-foreground text-sm whitespace-pre-line break-words md:max-w-prose" style={{ overflowWrap: 'anywhere' }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Related Products */}
          <ProductSection
            title="Você também pode gostar"
            products={(allProducts || []).filter(p => p.id !== product.id).slice(0, 8)}
            isLoading={productsLoading}
            linkTo="/catalog"
            linkText="VER CATÁLOGO"
          />

          {/* Reviews Section */}
          <div className="mt-6 pt-4 md:mt-12 md:pt-8 border-t">
            <ProductReviews productId={product.id} />
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Mobile sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border p-3 safe-area-bottom">
        <div className="flex gap-2">
          <Button 
            onClick={handleAddToCart}
            disabled={!isAvailable}
            variant="outline"
            className="flex-1 h-11"
            size="default"
          >
            <ShoppingCart className="h-4 w-4 mr-1.5 flex-shrink-0" />
            Carrinho
          </Button>
          
          <Button 
            onClick={handleBuyNow}
            disabled={!isAvailable}
            className="flex-1 h-11 bg-chrome hover:bg-chrome-dark text-white touch-manipulation"
            size="default"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            Comprar Agora
          </Button>
        </div>
      </div>

      <MobileBottomNav />
      
      
      <BuyNowModal
        open={buyNowModalOpen}
        onOpenChange={setBuyNowModalOpen}
        item={buyNowItem}
      />
    </div>
  );
}

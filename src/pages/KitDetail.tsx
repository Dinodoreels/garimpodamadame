import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, Package, ShoppingCart, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useKitByHandle } from '@/hooks/useKits';
import { useCartStore } from '@/stores/cartStore';
import { getKitPricing } from '@/components/home/KitCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { applySeoMetadata } from '@/components/seo/RouteSeo';

const formatPrice = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function KitDetail() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { data: kit, isLoading } = useKitByHandle(handle);
  const addItem = useCartStore((s) => s.addItem);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!kit || !handle) return;
    const description = kit.description?.trim() || `Conheça o kit ${kit.title} disponível no O Garimpo Digital.`;
    applySeoMetadata(`${kit.title} | O Garimpo Digital`, description, `/kits/${handle}`, kit.image_url || kit.gallery_urls?.[0]);
  }, [kit, handle]);

  const productIds = useMemo(
    () => ((kit as any)?.product_kit_items || []).map((it: any) => it.product_id).filter(Boolean),
    [kit]
  );

  // Fetch default variant for each product to enable add-to-cart
  const { data: variantsByProduct = {} } = useQuery({
    queryKey: ['kit-variants', productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .in('product_id', productIds);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((v: any) => {
        if (!map[v.product_id]) map[v.product_id] = v;
      });
      return map;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl mb-3">Kit não encontrado</h1>
          <Button asChild variant="outline">
            <Link to="/kits">Ver outros kits</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const items = ((kit as any).product_kit_items || []) as any[];
  const { fullPrice, finalPrice, savings, savingsPercent } = getKitPricing(kit);
  const gallery: string[] = [
    ...(kit.image_url ? [kit.image_url] : []),
    ...((kit.gallery_urls || []) as string[]),
  ];
  if (gallery.length === 0) {
    const firstProductImg = items[0]?.products?.product_images?.[0]?.url;
    if (firstProductImg) gallery.push(firstProductImg);
  }
  const cover = gallery[activeImg] || gallery[0];

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      const totalUnitsValue = items.reduce(
        (sum: number, it: any) => sum + (it.products?.price || 0) * (it.quantity || 1),
        0
      );
      let added = 0;
      for (const it of items) {
        const variant = variantsByProduct[it.product_id];
        if (!variant || !it.products) continue;
        const productPrice = it.products.price || 0;
        // Distribute kit final price proportionally to original prices
        const proportion = totalUnitsValue > 0 ? productPrice / totalUnitsValue : 1 / items.length;
        const itemTotal = finalPrice * proportion;
        const kitUnitPrice = (it.quantity || 1) > 0 ? itemTotal / (it.quantity || 1) : itemTotal;
        addItem({
          product: {
            id: it.products.id,
            title: it.products.title,
            handle: it.products.handle,
            images: it.products.product_images || [],
          } as any,
          variant: variant as any,
          quantity: it.quantity || 1,
          kitId: kit.id,
          kitTitle: kit.title,
          kitUnitPrice,
        });
        added++;
      }
      if (added === 0) {
        toast.error('Nenhum item disponível neste kit.');
      } else {
        toast.success(`Kit "${kit.title}" adicionado ao carrinho!`);
        const trigger = document.querySelector('[data-cart-trigger]') as HTMLElement | null;
        trigger?.click();
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar kit');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-32 md:pb-0">
        <div className="container py-4 lg:py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="aspect-square bg-muted overflow-hidden relative">
                {cover ? (
                  <img src={cover} alt={kit.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Package className="h-16 w-16 opacity-40" strokeWidth={1.2} />
                  </div>
                )}
                <Badge className="absolute top-3 left-3 bg-foreground text-background tracking-widest text-[10px]">
                  KIT
                </Badge>
                {savingsPercent > 0 && (
                  <Badge className="absolute top-3 right-3 bg-chrome text-white">
                    ECONOMIZE {savingsPercent}%
                  </Badge>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {gallery.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`aspect-square bg-muted overflow-hidden border-2 transition ${
                        i === activeImg ? 'border-chrome' : 'border-transparent'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-6">
              <div>
                <p className="text-xs tracking-luxury text-muted-foreground mb-2">COMBO EXCLUSIVO</p>
                <h1 className="font-display text-2xl lg:text-4xl font-light tracking-wide">
                  {kit.title}
                </h1>
                {kit.description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                    {kit.description}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                {fullPrice > finalPrice && (
                  <p className="text-sm text-muted-foreground line-through">{formatPrice(fullPrice)}</p>
                )}
                <div className="flex items-baseline gap-3">
                  <p className="font-display text-3xl lg:text-4xl text-chrome">
                    {formatPrice(finalPrice)}
                  </p>
                  {savings > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Economia de {formatPrice(savings)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border border-border/50 p-4 space-y-3">
                <p className="text-xs tracking-luxury text-muted-foreground">O QUE VEM NO KIT</p>
                <ul className="space-y-2">
                  {items.map((it: any) => (
                    <li key={it.id} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-chrome flex-shrink-0" />
                      {it.products ? (
                        <Link to={`/product/${it.products.handle}`} className="hover:text-chrome transition">
                          {it.quantity}× {it.products.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Item indisponível</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={adding}
                size="lg"
                className="hidden lg:inline-flex w-full h-14 bg-chrome hover:bg-chrome-dark text-white"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Adicionar Kit ao Carrinho
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky mobile bar */}
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border/50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] tracking-luxury text-muted-foreground">TOTAL DO KIT</p>
              <p className="font-display text-lg text-chrome">{formatPrice(finalPrice)}</p>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={adding}
              className="flex-1 h-12 bg-chrome hover:bg-chrome-dark text-white"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar Kit'}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
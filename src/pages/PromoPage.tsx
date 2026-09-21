import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePromoPageBySlug } from '@/hooks/usePromoPages';
import { useActivePromotions, getPromotionalPrice } from '@/hooks/usePromotionsAdvanced';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/hooks/useProducts';
import { applySeoMetadata } from '@/components/seo/RouteSeo';

export default function PromoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = usePromoPageBySlug(slug || '');
  const { data: promotions = [] } = useActivePromotions();

  useEffect(() => {
    if (!page || !slug) return;
    const title = page.seo_title?.trim() || `${page.hero_title?.trim() || page.title} | O Garimpo Digital`;
    const description = page.seo_description?.trim() || page.hero_subtitle?.trim() || `Confira ${page.title} no O Garimpo Digital.`;
    applySeoMetadata(title, description, `/promo/${slug}`, page.social_image_url || page.hero_image || page.banner_images[0]);
  }, [page, slug]);

  const productIds = page?.product_ids || [];
  const { data: products = [] } = useQuery({
    queryKey: ['promo-page-products', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(url, position, alt_text), product_variants(id, title, price, compare_at_price, inventory_quantity, is_available, option1, option2, option3, sku), product_options(id, name, values, position)')
        .in('id', productIds)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        images: (p.product_images || []).sort((a: any, b: any) => a.position - b.position),
        variants: p.product_variants || [],
        options: p.product_options || [],
      })) as Product[];
    },
    enabled: productIds.length > 0,
  });

  if (isLoading) return (
    <>
      <Header />
      <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      <Footer />
    </>
  );

  if (error || !page) return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <Link to="/" className="text-primary underline">Voltar ao início</Link>
      </div>
      <Footer />
    </>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero */}
        {page.hero_image && (
          <section className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
            <img src={page.hero_image} alt={page.hero_title || page.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            {page.show_hero_text && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4 z-10">
                {page.hero_title && <h1 className="text-3xl md:text-5xl font-bold mb-3">{page.hero_title}</h1>}
                {page.hero_subtitle && <p className="text-lg md:text-xl opacity-90 max-w-2xl">{page.hero_subtitle}</p>}
              </div>
            )}
          </section>
        )}

        {/* Banners */}
        {page.banner_images.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {page.banner_images.map((url, i) => (
                <img key={i} src={url} alt={`Banner ${i + 1}`} className="w-full rounded-lg object-cover max-h-64" />
              ))}
            </div>
          </section>
        )}

        {/* Products */}
        {products.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

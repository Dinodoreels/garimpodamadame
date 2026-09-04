import { Link } from 'react-router-dom';
import { ArrowRight, Award, Truck, MessageCircle, ShieldCheck, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

import { HeroBannerCarousel } from '@/components/home/HeroBannerCarousel';
import { ProductSection } from '@/components/home/ProductSection';
import { KitsSection } from '@/components/home/KitsSection';
import { useNewProducts, usePromoProducts, useTopProducts, useRecommendedProducts } from '@/hooks/useProductSections';
import { useAuth } from '@/hooks/useAuth';
import { useCMSHomePage, type CMSSection } from '@/hooks/useCMS';
import { DynamicSection } from '@/components/cms/blocks/DynamicSection';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';


export default function Index() {
  const { user } = useAuth();
   const { data: cmsHomePage, isLoading: loadingCMS } = useCMSHomePage();
 
   // If a CMS homepage exists and is published, render it
   if (cmsHomePage && !loadingCMS) {
     return (
       <div className="min-h-screen flex flex-col bg-background">
         <Header />
         <main className="flex-1 pb-16 md:pb-0">
           {cmsHomePage.sections?.map((section) => (
             <DynamicSection key={section.id} section={section as CMSSection} />
           ))}
         </main>
         <Footer />
         <MobileBottomNav />


       </div>
     );
   }
 
 // Fallback to static homepage
   return <StaticHomePage user={user} />;
 }
 
 // Static homepage component (original implementation)
function StaticHomePage({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
    const theme = useCMSThemeContext();
    const texts = ((theme as unknown as Record<string, unknown>)?.texts || {}) as Record<string, string>;
    const social = (theme?.social as Record<string, string>) || {};
    const whatsappNumber = social.whatsapp || '5511999999999';

    const benefits = [
      { icon: Award, title: texts.benefit_1_title || 'Qualidade', description: texts.benefit_1_desc || 'Produtos premium selecionados com alto padrão.' },
      { icon: Truck, title: texts.benefit_2_title || 'Envio Rápido', description: texts.benefit_2_desc || 'Entrega expressa para todo o Brasil.' },
      { icon: MessageCircle, title: texts.benefit_3_title || 'Atendimento', description: texts.benefit_3_desc || 'Suporte personalizado via WhatsApp.' },
      { icon: ShieldCheck, title: texts.benefit_4_title || 'Garantia', description: texts.benefit_4_desc || 'Proteção contra defeitos de fabricação.' },
    ];

    const testimonials = [
      { name: texts.testimonial_1_name || 'Carlos S.', text: texts.testimonial_1_text || 'Produto chegou exatamente como descrito. Qualidade impecável.' },
      { name: texts.testimonial_2_name || 'Ana C.', text: texts.testimonial_2_text || 'Melhor loja de importados. Entrega rápida e produto original.' },
      { name: texts.testimonial_3_name || 'Rafael M.', text: texts.testimonial_3_text || 'Recomendo. Preço justo e suporte excelente.' },
    ];

    const { data: newProducts, isLoading: loadingNew } = useNewProducts(8);
   const { data: promoProducts, isLoading: loadingPromo } = usePromoProducts(8);
   const { data: topProducts, isLoading: loadingTop } = useTopProducts(8);
   const { data: recommendedProducts, isLoading: loadingRecommended } = useRecommendedProducts(user?.id, 8);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pb-16 md:pb-0">
        {/* Hero Banner Carousel */}
        <HeroBannerCarousel />

        {/* Benefits Section */}
        <section className="py-8 lg:py-12 bg-secondary/50">
          <div className="container">
            <div className="grid grid-cols-2 lg:grid-cols-4 stagger-children">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={index} 
                    className={`text-center p-6 lg:p-8 flex flex-col items-center gap-3
                      ${index % 2 === 0 ? 'border-r border-border/50' : ''} 
                      ${index < 2 ? 'border-b lg:border-b-0 border-border/50' : ''} 
                      ${index < 3 ? 'lg:border-r lg:border-border/50' : ''}
                    `}
                  >
                    <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-chrome" strokeWidth={1.5} />
                    <h2 className="font-display text-base lg:text-lg font-light tracking-wide">
                      {benefit.title}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* New Products Section */}
        <ProductSection
          title="Novidades"
          subtitle="RECÉM CHEGADOS"
          products={newProducts || []}
          isLoading={loadingNew}
          linkTo="/catalog?sort=newest"
          linkText="VER NOVIDADES"
        />

        {/* Promo Products Section */}
        <ProductSection
          title="Destaques"
          subtitle="PROMOÇÕES"
          products={promoProducts || []}
          isLoading={loadingPromo}
          linkTo="/catalog?sale=true"
          linkText="VER PROMOÇÕES"
        />

        {/* Kits & Combos */}
        <KitsSection />

        {/* Personalized Recommendations (logged in users only) */}
        {user && (
          <ProductSection
            title="Para Você"
            subtitle="RECOMENDADOS"
            products={recommendedProducts || []}
            isLoading={loadingRecommended}
            linkTo="/catalog"
            linkText="EXPLORAR MAIS"
          />
        )}

        {/* Top Products Section */}
        <ProductSection
          title="Top Produtos"
          subtitle="MAIS VENDIDOS"
          products={topProducts || []}
          isLoading={loadingTop}
          linkTo="/catalog"
          linkText="VER TUDO"
        />


        {/* Testimonials Section */}
        <section className="py-16 lg:py-24 border-t border-border/50">
          <div className="container">
            <div className="text-center mb-12">
              <p className="text-xs tracking-[0.3em] text-muted-foreground mb-4">CLIENTES</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light tracking-wide">Depoimentos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <div key={i} className="text-center p-6">
                  <p className="text-muted-foreground italic mb-4 leading-relaxed">"{t.text}"</p>
                  <p className="font-display text-sm tracking-wide">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 border-t border-border/50 bg-secondary/30">
          <div className="container text-center">
            <p className="text-xs tracking-luxury text-muted-foreground mb-6">
              EXCLUSIVIDADE
            </p>
            <h2 className="font-display text-3xl lg:text-4xl font-light mb-6 tracking-wide">
              Algumas peças nunca voltam.
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-10">
              Garanta seu importado antes que acabe.
            </p>
            <Button 
              asChild 
              size="lg" 
              className="bg-foreground text-background hover:bg-foreground/90 tracking-wider text-xs px-8 min-h-[48px] transition-all duration-300 hover:scale-105"
            >
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                FALAR NO WHATSAPP
              </a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
      
    </div>
  );
}

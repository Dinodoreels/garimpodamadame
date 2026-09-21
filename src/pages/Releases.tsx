import { Link } from 'react-router-dom';
import { Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/components/products/ProductGrid';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useNewProducts } from '@/hooks/useProductSections';
import { useCMSPageBySlugOrHome } from '@/hooks/useCMS';
import { CMSPageRenderer } from '@/components/cms/CMSPageRenderer';
import { useSiteContent } from '@/hooks/useSiteContent';
import { HeroBannerCarousel } from '@/components/home/HeroBannerCarousel';

interface ReleasesContent {
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  show_hero_text: boolean;
  testimonials: { name: string; text: string; location: string }[];
  cta_title: string;
  cta_subtitle: string;
}

const defaultContent: ReleasesContent = {
  hero_badge: 'Novidades',
  hero_title: 'Lançamentos',
  hero_subtitle: 'Confira as últimas novidades em roupas, calçados e acessórios importados',
  hero_image: '',
  show_hero_text: true,
  testimonials: [],
  cta_title: 'Não Encontrou o Que Procura?',
  cta_subtitle: 'Entre em contato conosco e encomende seu produto exclusivo',
};

function StaticReleasesPage() {
  const { data: products, isLoading } = useNewProducts(24);
  const { data: savedContent } = useSiteContent<ReleasesContent>('releases');

  const content = { ...defaultContent, ...savedContent };
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <h1 className="sr-only">{content.hero_title}</h1>
        <HeroBannerCarousel compact />

        {/* New Products */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <ProductGrid products={products || []} isLoading={isLoading} />
          </div>
        </section>

        {/* Testimonials */}
        {content.testimonials.length > 0 && (
          <section className="py-16 bg-secondary/50">
            <div className="container">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-center mb-12">
                O Que Nossos Clientes Dizem
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {content.testimonials.map((testimonial, index) => (
                  <Card key={index} className="bg-card">
                    <CardContent className="pt-6">
                      <Quote className="h-8 w-8 text-gold/30 mb-4" />
                      <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16">
          <div className="container text-center">
            <h2 className="font-display text-2xl font-bold mb-4">
              {content.cta_title}
            </h2>
            <p className="text-muted-foreground mb-6">
              {content.cta_subtitle}
            </p>
            <div className="flex justify-center gap-4">
              <WhatsAppButton 
                variant="inline" 
                message="Olá! Gostaria de encomendar um produto específico." 
              />
              <Button asChild variant="outline">
                <Link to="/contact">Fale Conosco</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function Releases() {
  const { data: cmsPage, isLoading } = useCMSPageBySlugOrHome('releases');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-32 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (cmsPage) {
    return <CMSPageRenderer page={cmsPage} />;
  }

  return <StaticReleasesPage />;
}

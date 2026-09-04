import { Link } from 'react-router-dom';
import { Sparkles, Quote } from 'lucide-react';
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
  testimonials: [
    { name: 'Ana Silva', text: 'Produtos de excelente qualidade! Atendimento impecável e entrega super rápida.', location: 'São Paulo, SP' },
    { name: 'Carlos Santos', text: 'Melhor loja de importados que já comprei. Produtos autênticos e preços justos.', location: 'Rio de Janeiro, RJ' },
    { name: 'Maria Oliveira', text: 'Amei minha compra! O tênis chegou perfeito e exatamente como nas fotos.', location: 'Belo Horizonte, MG' },
  ],
  cta_title: 'Não Encontrou o Que Procura?',
  cta_subtitle: 'Entre em contato conosco e encomende seu produto exclusivo',
};

function StaticReleasesPage() {
  const { data: products, isLoading } = useNewProducts(24);
  const { data: savedContent } = useSiteContent<ReleasesContent>('releases');

  const content = { ...defaultContent, ...savedContent };
  const hasHeroImage = !!content.hero_image;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="relative text-primary-foreground py-16 lg:py-24 overflow-hidden">
          {hasHeroImage ? (
            <>
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${content.hero_image})` }}
              />
              <div className="absolute inset-0 bg-black/50" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-primary" />
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--gold))_0%,transparent_50%)]" />
              </div>
            </>
          )}
          
          {content.show_hero_text !== false && (
            <div className="container relative z-10 text-center">
              <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                {content.hero_badge}
              </div>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
                {content.hero_title}
              </h1>
              <p className="text-white/70 max-w-lg mx-auto">
                {content.hero_subtitle}
              </p>
            </div>
          )}
        </section>

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

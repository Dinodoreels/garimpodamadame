import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import { useCMSPageBySlugOrHome } from '@/hooks/useCMS';
import { CMSPageRenderer } from '@/components/cms/CMSPageRenderer';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteContent } from '@/hooks/useSiteContent';

interface AboutContent {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  show_hero_text: boolean;
  story_title: string;
  story_paragraphs: string[];
  mission_quote: string;
  vision_title: string;
  vision_paragraphs: string[];
  team_image: string;
  video_url: string;
  cta_title: string;
  cta_subtitle: string;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?/]+)/);
  return match ? match[1] : null;
}

function StaticAboutPage() {
  const { data: content } = useSiteContent<AboutContent>('about_content');

  const hero_title = content?.hero_title || 'Não vendemos roupa. Entregamos presença.';
  const hero_subtitle = content?.hero_subtitle || 'Conheça a história por trás do O Garimpo Digital e nossa missão de oferecer uma seleção cuidadosa de produtos.';
  const story_title = content?.story_title || 'De onde viemos';
  const story_paragraphs = content?.story_paragraphs || [
    'O Garimpo Digital nasceu com um propósito claro: oferecer produtos selecionados com cuidado, procedência e uma experiência de compra simples.',
    'Começamos pequeno, atendendo amigos próximos e familiares que queriam acesso ao que há de melhor no mercado internacional. O boca a boca fez o resto. Hoje, somos referência para quem busca qualidade, autenticidade e atendimento diferenciado.',
    'Cada peça que entra no nosso catálogo passa por uma curadoria rigorosa. Não trabalhamos com quantidade — trabalhamos com confiança.',
  ];
  const mission_quote = content?.mission_quote || 'Nossa missão é transformar a experiência de quem consome moda, oferecendo acesso ao que há de melhor no mundo sem que você precise sair do Brasil — ou pagar preços absurdos.';
  const vision_title = content?.vision_title || 'Para onde vamos';
  const vision_paragraphs = content?.vision_paragraphs || [
    'Nosso objetivo é nos tornar a principal referência em importados premium no Brasil. Queremos que cada cliente se sinta parte de algo exclusivo.',
    'Estamos constantemente expandindo nosso catálogo, buscando novas marcas e produtos que atendam aos padrões de qualidade que nossos clientes esperam.',
  ];
  const cta_title = content?.cta_title || 'Se você está aqui, é porque não veio ao mundo pra ser comum.';
  const cta_subtitle = content?.cta_subtitle || 'Descubra produtos que combinam com quem você realmente é.';
  const hero_image = content?.hero_image || '';
  const team_image = content?.team_image || '';
  const video_url = content?.video_url || '';
  const videoId = video_url ? getYouTubeId(video_url) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative bg-primary text-primary-foreground py-20 lg:py-32 overflow-hidden">
          {hero_image && (
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${hero_image})` }} />
          )}
          {hero_image && <div className="absolute inset-0 bg-black/60" />}
          <div className="container relative z-10">
            {content?.show_hero_text !== false && (
              <>
                <span className="inline-block border border-chrome text-chrome px-4 py-1 rounded-full text-sm font-medium mb-6">Sobre Nós</span>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6 max-w-3xl">
                  {hero_title.includes('Entregamos presença') ? (
                    <>Não vendemos roupa. <span className="text-chrome">Entregamos presença.</span></>
                  ) : hero_title}
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl">{hero_subtitle}</p>
              </>
            )}
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto">
              <span className="inline-block border border-chrome text-chrome px-4 py-1 rounded-full text-sm font-medium mb-6">Nossa História</span>
              <h2 className="font-display text-2xl lg:text-3xl font-bold mb-8">{story_title}</h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                {story_paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-xl lg:text-2xl leading-relaxed font-light italic">"{mission_quote}"</p>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block border border-chrome text-chrome px-4 py-1 rounded-full text-sm font-medium mb-6">Visão de Futuro</span>
                <h2 className="font-display text-2xl lg:text-3xl font-bold mb-6">{vision_title}</h2>
                <div className="space-y-4 text-muted-foreground">
                  {vision_paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
              <div className="bg-secondary/50 rounded-2xl aspect-video flex items-center justify-center overflow-hidden">
                {team_image ? (
                  <img src={team_image} alt="Equipe" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-muted-foreground">Imagem da equipe</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {videoId && (
          <section className="py-16 lg:py-24">
            <div className="container max-w-4xl mx-auto">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                  title="Vídeo Institucional"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </section>
        )}

        <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="font-display text-2xl lg:text-3xl font-bold mb-4 max-w-2xl mx-auto">{cta_title}</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{cta_subtitle}</p>
            <Link to="/catalog">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                Ver Coleção <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      
    </div>
  );
}

export default function About() {
  const { data: cmsPage, isLoading } = useCMSPageBySlugOrHome('about');

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

  if (cmsPage) return <CMSPageRenderer page={cmsPage} />;
  return <StaticAboutPage />;
}

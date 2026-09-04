import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveBanners } from '@/hooks/useBanners';
import { cn } from '@/lib/utils';
import heroBg from '@/assets/hero-bg.jpg';
import { useCMSThemeContext } from '@/providers/CMSThemeProvider';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useIsMobile } from '@/hooks/use-mobile';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?/]+)/);
  return match ? match[1] : null;
}

export function HeroBannerCarousel() {
  const theme = useCMSThemeContext();
  const { data: intConfig } = useIntegrations();
  const isMobile = useIsMobile();
  const social = (theme?.social as Record<string, string>) || {};
  const texts = ((theme as unknown as Record<string, unknown>)?.texts || {}) as Record<string, string>;
  const heroBadge = texts.hero_badge || 'IMPORTADOS SELECIONADOS';
  const heroTitle = texts.hero_title || 'O melhor do mundo, na sua quebrada.';
  const heroSubtitle = texts.hero_subtitle || 'Produtos importados originais com garantia, entrega rápida e atendimento personalizado.';
  const phoneNumber = intConfig?.contact_phone || social.whatsapp || '5511999999999';
  const { data: banners, isLoading } = useActiveBanners();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Autoplay
  useEffect(() => {
    if (!emblaApi || !banners?.length || banners.length <= 1) return;
    
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [emblaApi, banners?.length]);

  if (isLoading) {
    return (
      <section className="relative min-h-[70vh] lg:min-h-[85vh] overflow-hidden bg-muted animate-pulse" />
    );
  }

  if (!banners?.length) {
    return (
      <section className="relative min-h-[70vh] lg:min-h-[85vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />
        <div className="container relative z-10 flex flex-col items-center justify-center text-center min-h-[70vh] lg:min-h-[85vh]">
          <p className="text-xs tracking-[0.3em] text-white/70 mb-6 font-light">
            {heroBadge}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-light leading-tight mb-6 text-white tracking-wide drop-shadow-lg">
            {heroTitle}
          </h1>
          <p className="text-sm text-white/70 max-w-lg mb-10 font-light tracking-wide">
            {heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              asChild 
              size="lg" 
              variant="outline"
              className="border-white/30 text-white hover:bg-white hover:text-foreground bg-transparent tracking-wider text-xs px-8 min-h-[48px] transition-all duration-300 hover:scale-105"
            >
              <Link to="/catalog">VER COLEÇÃO</Link>
            </Button>
            <Button 
              asChild 
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white tracking-wider text-xs px-8 min-h-[48px] transition-all duration-300 hover:scale-105"
            >
              <a href={`https://wa.me/${phoneNumber}`} target="_blank" rel="noopener noreferrer">
                FALAR NO WHATSAPP
              </a>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[70vh] lg:min-h-[85vh] overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden h-full">
        <div className="flex h-full">
          {banners.map((banner) => {
            const isVideo = banner.media_type === 'video' && banner.video_url;
            const videoId = isVideo ? getYouTubeId(banner.video_url!) : null;
            const displayImage = (isMobile && banner.mobile_image_url) ? banner.mobile_image_url : banner.image_url;
            const objectPos = isMobile ? (banner.mobile_object_position || '50% 50%') : (banner.desktop_object_position || '50% 50%');

            return (
            <div key={banner.id} className={cn("relative min-w-full min-h-[70vh] lg:min-h-[85vh] flex-shrink-0", banner.click_url && "cursor-pointer")}
              onClick={() => {
                if (banner.click_url) {
                  if (banner.click_url.startsWith('http')) {
                    window.open(banner.click_url, '_blank', 'noopener,noreferrer');
                  } else {
                    window.location.href = banner.click_url;
                  }
                }
              }}
            >
              {/* Background */}
              {banner.media_type === 'video_file' && banner.video_url ? (
                <div className="absolute inset-0 overflow-hidden">
                  <video
                    src={banner.video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover"
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
              ) : isVideo && videoId ? (
                <div className="absolute inset-0 overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                    title="Video Banner"
                    allow="autoplay; encrypted-media"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full min-h-full"
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
              ) : (
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={displayImage}
                  alt={banner.title || ''}
                  className="w-full h-full object-cover scale-105 transition-transform duration-700"
                  style={{ objectPosition: objectPos }}
                />
              </div>
              )}
              {/* Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-black"
                style={{ opacity: banner.overlay_opacity / 100 }}
              />
              
              {/* Content */}
              <div className="container relative z-10 flex flex-col items-center justify-center text-center min-h-[70vh] lg:min-h-[85vh]">
                {banner.title && (
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-light leading-tight mb-6 text-white tracking-wide drop-shadow-lg">
                    {banner.title}
                  </h1>
                )}
                
                {banner.subtitle && (
                  <p className="text-sm text-white/70 max-w-lg mb-10 font-light tracking-wide">
                    {banner.subtitle}
                  </p>
                )}
                
                {banner.show_button !== false && banner.button_text && banner.button_link && (() => {
                    const btnLink = banner.click_url || banner.button_link;
                    const isExternal = btnLink?.startsWith('http') || btnLink?.startsWith('mailto:') || btnLink?.startsWith('tel:');
                    return (
                      <Button 
                        asChild 
                        size="lg" 
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white hover:text-foreground bg-transparent tracking-wider text-xs px-8 min-h-[48px] transition-all duration-300 hover:scale-105"
                      >
                        {isExternal ? (
                          <a href={btnLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            {banner.button_text}
                          </a>
                        ) : (
                          <Link to={btnLink || '/'} onClick={(e) => e.stopPropagation()}>
                            {banner.button_text}
                          </Link>
                        )}
                      </Button>
                    );
                })()}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all disabled:opacity-30"
            disabled={!canScrollPrev}
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all disabled:opacity-30"
            disabled={!canScrollNext}
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === selectedIndex 
                  ? "bg-white w-6" 
                  : "bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Ir para banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

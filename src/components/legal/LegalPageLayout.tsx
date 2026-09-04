import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useSiteContent } from '@/hooks/useSiteContent';
import { Loader2 } from 'lucide-react';
import type { LegalDocument } from '@/components/admin/LegalTab';

interface LegalPageLayoutProps {
  settingsKey: string;
  fallback: React.ReactNode;
}

export function LegalPageLayout({ settingsKey, fallback }: LegalPageLayoutProps) {
  const { data, isLoading } = useSiteContent<LegalDocument>(settingsKey);

  const hasContent = data && data.sections && data.sections.length > 0 && data.sections.some(s => s.title || s.content);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12 max-w-4xl">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasContent ? (
          <>
            <h1 className="text-3xl font-display font-bold mb-4">{data.page_title}</h1>
            {data.subtitle && <p className="text-lg text-chrome font-medium mb-2">{data.subtitle}</p>}
            {data.last_updated && (
              <p className="text-sm text-muted-foreground mb-8">
                Última atualização: {data.last_updated}
              </p>
            )}
            <div className="prose prose-neutral max-w-none space-y-8">
              {data.sections.map((section, index) => (
                <section key={index}>
                  {section.title && <h2 className="text-xl font-semibold mb-4">{section.title}</h2>}
                  {section.content && section.content.split('\n\n').map((paragraph, pIndex) => (
                    <p key={pIndex} className="text-muted-foreground leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </>
        ) : (
          fallback
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

import { type CMSPage, type CMSSection } from '@/hooks/useCMS';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

import { DynamicSection } from './blocks/DynamicSection';

interface CMSPageRendererProps {
  page: CMSPage;
  showNav?: boolean;
}

export function CMSPageRenderer({ page, showNav = true }: CMSPageRendererProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {page.sections?.map((section) => (
          <DynamicSection key={section.id} section={section as CMSSection} />
        ))}
      </main>
      <Footer />
      {showNav && <MobileBottomNav />}
      
    </div>
  );
}

 import { useEffect } from 'react';
 import { useParams, useSearchParams } from 'react-router-dom';
 import { useCMSPageBySlug, type CMSSection } from '@/hooks/useCMS';
 import { useAdmin } from '@/hooks/useAdmin';
 import { Header } from '@/components/layout/Header';
 import { Footer } from '@/components/layout/Footer';
 import { DynamicSection } from '@/components/cms/blocks/DynamicSection';
 import { Loader2, AlertTriangle } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useQuery } from '@tanstack/react-query';
 import { applySeoMetadata } from '@/components/seo/RouteSeo';

 function findPageImage(sections: CMSSection[] | undefined) {
   const values = sections?.flatMap((section) => Object.values((section.content || {}) as Record<string, unknown>)) || [];
   return values.find((value): value is string => typeof value === 'string' && /^(https?:\/\/|\/).+\.(avif|jpe?g|png|webp)(\?.*)?$/i.test(value));
 }
 
 export default function CMSPage() {
   const { slug } = useParams<{ slug: string }>();
   const [searchParams] = useSearchParams();
   const isPreview = searchParams.get('preview') === 'true';
   const { isAdmin } = useAdmin();
 
   // Custom query that handles preview mode
   const { data: page, isLoading, error } = useQuery({
     queryKey: ['cms-page-slug', slug, isPreview],
     queryFn: async () => {
       if (!slug) return null;
       
       let query = supabase
         .from('cms_pages')
         .select(`
           *,
           sections:cms_sections(*)
         `)
         .eq('slug', slug);
       
       // Only filter by is_published for non-preview mode
       if (!isPreview) {
         query = query.eq('is_published', true);
       }
       
       const { data, error } = await query.maybeSingle();
       if (error) throw error;
       if (!data) return null;
       
       if (data?.sections) {
         data.sections = (data.sections as CMSSection[]).sort((a, b) => a.position - b.position);
       }
       
       return data;
     },
     enabled: !!slug,
   });

    useEffect(() => {
      if (!page || !slug) return;
      const title = page.seo_title?.trim() || page.title;
      const description = page.seo_description?.trim() || `Conheça ${page.title} no O Garimpo Digital.`;
      applySeoMetadata(`${title} | O Garimpo Digital`, description, `/p/${slug}`, page.social_image_url || findPageImage(page.sections as CMSSection[] | undefined));
    }, [page, slug]);
 
   if (isLoading) {
     return (
       <div className="min-h-screen flex flex-col">
         <Header />
         <main className="flex-1 flex items-center justify-center">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </main>
         <Footer />
       </div>
     );
   }
 
   if (error || !page) {
     return (
       <div className="min-h-screen flex flex-col">
         <Header />
         <main className="flex-1 flex flex-col items-center justify-center gap-4">
           <AlertTriangle className="h-12 w-12 text-muted-foreground" />
           <h1 className="text-2xl font-display">Página não encontrada</h1>
           <p className="text-muted-foreground">A página que você procura não existe ou não está publicada.</p>
         </main>
         <Footer />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex flex-col">
       <Header />
       
       {/* Preview Banner */}
       {isPreview && isAdmin && (
         <div className="bg-warning text-warning-foreground text-center py-2 text-sm font-medium">
           ⚠️ Visualizando rascunho — Esta página ainda não está publicada
         </div>
       )}
       
       <main className="flex-1">
         {page.sections?.map((section) => (
           <DynamicSection key={section.id} section={section as CMSSection} />
         ))}
       </main>
       
       <Footer />
     </div>
   );
 }
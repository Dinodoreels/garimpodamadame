import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SeoKind = 'product' | 'page' | 'promo' | 'kit';
export type SeoItem = {
  id: string;
  kind: SeoKind;
  name: string;
  path: string;
  title: string;
  description: string;
  image: string;
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackImage: string;
  published: boolean;
};

export type StaticSeoEntry = { path: string; name: string; title: string; description: string; image: string };
export type SeoMetadataSettings = { routes: StaticSeoEntry[]; updated_at?: string };

const staticDefaults: StaticSeoEntry[] = [
  { path: '/', name: 'Início', title: 'O Garimpo Digital — Produtos selecionados e ofertas', description: 'Encontre produtos selecionados, novidades, kits e ofertas no O Garimpo Digital, com entrega para todo o Brasil.', image: '' },
  { path: '/catalog', name: 'Catálogo', title: 'Catálogo | O Garimpo Digital', description: 'Explore o catálogo do O Garimpo Digital e encontre produtos, novidades e ofertas disponíveis.', image: '' },
  { path: '/releases', name: 'Novidades', title: 'Novidades | O Garimpo Digital', description: 'Confira os produtos recém-chegados e os lançamentos disponíveis no O Garimpo Digital.', image: '' },
  { path: '/lote', name: 'Venda em lote', title: 'Venda em lote | O Garimpo Digital', description: 'Consulte as opções de venda em lote disponíveis no O Garimpo Digital.', image: '' },
  { path: '/about', name: 'Sobre nós', title: 'Sobre nós | O Garimpo Digital', description: 'Conheça a história, a curadoria e o propósito do O Garimpo Digital.', image: '' },
  { path: '/contact', name: 'Contato', title: 'Contato | O Garimpo Digital', description: 'Entre em contato com a equipe do O Garimpo Digital para tirar dúvidas sobre produtos e pedidos.', image: '' },
  { path: '/kits', name: 'Kits e combos', title: 'Kits e combos | O Garimpo Digital', description: 'Conheça os kits e combos disponíveis no O Garimpo Digital.', image: '' },
];

export function useSeoItems() {
  return useQuery({
    queryKey: ['seo-admin-items'],
    queryFn: async () => {
      const [products, pages, promos, kits, settings] = await Promise.all([
        supabase.from('products').select('id,title,description,handle,status,seo_title,seo_description,social_image_url,product_images(url,position)').order('title'),
        supabase.from('cms_pages').select('id,title,slug,is_published,seo_title,seo_description,social_image_url').order('title'),
        supabase.from('promo_pages').select('id,title,slug,is_published,hero_title,hero_subtitle,hero_image,banner_images,seo_title,seo_description,social_image_url').order('title'),
        supabase.from('product_kits').select('id,title,description,handle,status,is_available,image_url,gallery_urls,seo_title,seo_description,social_image_url').order('title'),
        supabase.from('site_settings').select('value').eq('key', 'seo_metadata').maybeSingle(),
      ]);
      const error = products.error || pages.error || promos.error || kits.error || settings.error;
      if (error) throw error;
      const items: SeoItem[] = [];
      for (const p of products.data || []) {
        const images = [...(p.product_images || [])].sort((a, b) => a.position - b.position);
        items.push({ id: p.id, kind: 'product', name: p.title, path: `/product/${p.handle}`, title: p.seo_title || '', description: p.seo_description || '', image: p.social_image_url || '', fallbackTitle: `${p.title} | O Garimpo Digital`, fallbackDescription: p.description?.trim() || `Conheça ${p.title} no O Garimpo Digital.`, fallbackImage: images[0]?.url || '', published: p.status === 'active' });
      }
      for (const p of pages.data || []) items.push({ id: p.id, kind: 'page', name: p.title, path: `/p/${p.slug}`, title: p.seo_title || '', description: p.seo_description || '', image: p.social_image_url || '', fallbackTitle: `${p.title} | O Garimpo Digital`, fallbackDescription: `Conheça ${p.title} no O Garimpo Digital.`, fallbackImage: '', published: p.is_published });
      for (const p of promos.data || []) items.push({ id: p.id, kind: 'promo', name: p.title, path: `/promo/${p.slug}`, title: p.seo_title || '', description: p.seo_description || '', image: p.social_image_url || '', fallbackTitle: `${p.hero_title || p.title} | O Garimpo Digital`, fallbackDescription: p.hero_subtitle || `Confira ${p.title} no O Garimpo Digital.`, fallbackImage: p.hero_image || p.banner_images?.[0] || '', published: p.is_published });
      for (const p of kits.data || []) items.push({ id: p.id, kind: 'kit', name: p.title, path: `/kits/${p.handle}`, title: p.seo_title || '', description: p.seo_description || '', image: p.social_image_url || '', fallbackTitle: `${p.title} | O Garimpo Digital`, fallbackDescription: p.description?.trim() || `Conheça o kit ${p.title} no O Garimpo Digital.`, fallbackImage: p.image_url || p.gallery_urls?.[0] || '', published: p.status === 'active' && p.is_available });
      const saved = settings.data?.value as SeoMetadataSettings | null;
      const routes = staticDefaults.map((route) => ({ ...route, ...(saved?.routes?.find((savedRoute) => savedRoute.path === route.path) || {}) }));
      return { items, routes };
    },
  });
}

export function useSaveSeo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: SeoItem) => {
      const table = item.kind === 'product' ? 'products' : item.kind === 'page' ? 'cms_pages' : item.kind === 'promo' ? 'promo_pages' : 'product_kits';
      const { error } = await supabase.from(table).update({ seo_title: item.title.trim() || null, seo_description: item.description.trim() || null, social_image_url: item.image.trim() || null } as never).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seo-admin-items'] }); toast.success('SEO salvo'); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar'),
  });
}

export function useSaveStaticSeo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routes: StaticSeoEntry[]) => {
      const value: SeoMetadataSettings = { routes, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('site_settings').upsert({ key: 'seo_metadata', value } as never, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seo-admin-items'] }); queryClient.invalidateQueries({ queryKey: ['site-content', 'seo_metadata'] }); toast.success('SEO da página salvo'); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar'),
  });
}

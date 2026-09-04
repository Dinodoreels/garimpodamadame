import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoPage {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  promotion_id: string | null;
  hero_image: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  show_hero_text: boolean;
  banner_images: string[];
  product_ids: string[];
  created_at: string;
  updated_at: string;
}

export function usePromoPages() {
  return useQuery({
    queryKey: ['promo-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        banner_images: Array.isArray(p.banner_images) ? p.banner_images : [],
        product_ids: Array.isArray(p.product_ids) ? p.product_ids : [],
      })) as PromoPage[];
    },
  });
}

export function usePromoPageBySlug(slug: string) {
  return useQuery({
    queryKey: ['promo-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      return {
        ...data,
        banner_images: Array.isArray(data.banner_images) ? data.banner_images : [],
        product_ids: Array.isArray(data.product_ids) ? data.product_ids : [],
      } as PromoPage;
    },
    enabled: !!slug,
  });
}

export function useCreatePromoPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: Omit<PromoPage, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('promo_pages').insert(page).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-pages'] }),
  });
}

export function useUpdatePromoPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...page }: Partial<PromoPage> & { id: string }) => {
      const { error } = await supabase.from('promo_pages').update(page).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-pages'] }),
  });
}

export function useDeletePromoPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promo_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-pages'] }),
  });
}

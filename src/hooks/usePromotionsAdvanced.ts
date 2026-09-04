import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Promotion {
  id: string;
  title: string;
  type: string; // temporary_price | buy_x_get_y | flash_sale
  status: string;
  starts_at: string;
  ends_at: string;
  config: Record<string, any>;
  created_at: string | null;
  promotion_products?: PromotionProduct[];
}

export interface PromotionProduct {
  id: string;
  promotion_id: string;
  product_id: string;
  variant_id: string | null;
  promotional_price: number | null;
  product?: any;
}

export function useActivePromotions() {
  return useQuery({
    queryKey: ['promotions-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, promotion_products(*, products(id, title, price, handle, product_images(url, position)))')
        .eq('status', 'active');
      if (error) throw error;
      const now = new Date().toISOString();
      return (data || []).filter((p: any) => p.starts_at <= now && p.ends_at >= now) as Promotion[];
    },
  });
}

export function useAdminPromotions() {
  return useQuery({
    queryKey: ['promotions-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, promotion_products(*, products(id, title, price, handle))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Promotion[];
    },
  });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (promo: { title: string; type: string; starts_at: string; ends_at: string; config?: Record<string, any>; products: { product_id: string; variant_id?: string; promotional_price?: number }[] }) => {
      const { products, ...promoData } = promo;
      const { data, error } = await supabase.from('promotions').insert(promoData).select().single();
      if (error) throw error;

      if (products.length > 0) {
        const { error: pe } = await supabase
          .from('promotion_products')
          .insert(products.map(p => ({ ...p, promotion_id: data.id })));
        if (pe) throw pe;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  });
}

export function useUpdatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...promo }: { id: string; title?: string; type?: string; starts_at?: string; ends_at?: string; config?: Record<string, any>; status?: string; products?: { product_id: string; variant_id?: string; promotional_price?: number }[] }) => {
      const { products, ...promoData } = promo;
      const { error } = await supabase.from('promotions').update(promoData).eq('id', id);
      if (error) throw error;

      if (products) {
        await supabase.from('promotion_products').delete().eq('promotion_id', id);
        if (products.length > 0) {
          const { error: pe } = await supabase
            .from('promotion_products')
            .insert(products.map(p => ({ ...p, promotion_id: id })));
          if (pe) throw pe;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  });
}

// Helper to get promotional price for a product
export function getPromotionalPrice(productId: string, promotions: Promotion[]): number | null {
  for (const promo of promotions) {
    if (promo.type === 'temporary_price' || promo.type === 'flash_sale') {
      const pp = promo.promotion_products?.find(p => p.product_id === productId);
      if (pp?.promotional_price) return pp.promotional_price;
    }
  }
  return null;
}

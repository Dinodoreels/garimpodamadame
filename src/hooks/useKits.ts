import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductKit {
  id: string;
  title: string;
  description: string | null;
  handle: string;
  image_url: string | null;
  gallery_urls?: string[] | null;
  pricing_type: string;
  fixed_price: number | null;
  discount_percent: number | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  is_available: boolean;
  position: number | null;
  created_at: string | null;
  items?: ProductKitItem[];
}

export interface ProductKitItem {
  id: string;
  kit_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product?: any;
}

export function useActiveKits() {
  return useQuery({
    queryKey: ['kits-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_kits')
        .select('*, product_kit_items(*, products(id, title, price, handle, product_images(url, position)))')
        .eq('status', 'active')
        .eq('is_available', true)
        .order('position');
      if (error) throw error;
      // Filter by date client-side for now
      const now = new Date().toISOString();
      return (data || []).filter((k: any) => {
        if (k.starts_at && k.starts_at > now) return false;
        if (k.ends_at && k.ends_at < now) return false;
        return true;
      }) as ProductKit[];
    },
  });
}

export function useAdminKits() {
  return useQuery({
    queryKey: ['kits-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_kits')
        .select('*, product_kit_items(*, products(id, title, price, handle))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProductKit[];
    },
  });
}

export function useKitByHandle(handle: string | undefined) {
  return useQuery({
    queryKey: ['kit-by-handle', handle],
    enabled: !!handle,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_kits')
        .select('*, product_kit_items(*, products(id, title, price, handle, product_images(url, position)))')
        .eq('handle', handle!)
        .eq('status', 'active')
        .eq('is_available', true)
        .maybeSingle();
      if (error) throw error;
      return data as ProductKit | null;
    },
  });
}

export function useCreateKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kit: { title: string; description?: string; handle: string; image_url?: string | null; gallery_urls?: string[]; pricing_type: string; fixed_price?: number | null; discount_percent?: number | null; starts_at?: string | null; ends_at?: string | null; status?: string; is_available?: boolean; items: { product_id: string; variant_id?: string; quantity: number }[] }) => {
      const { items, ...kitData } = kit;
      const { data, error } = await supabase
        .from('product_kits')
        .insert(kitData)
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('product_kit_items')
          .insert(items.map(i => ({ ...i, kit_id: data.id })));
        if (itemsError) throw itemsError;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kits'] }),
  });
}

export function useUpdateKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...kit }: { id: string; title?: string; description?: string; handle?: string; image_url?: string | null; gallery_urls?: string[]; pricing_type?: string; fixed_price?: number | null; discount_percent?: number | null; starts_at?: string | null; ends_at?: string | null; status?: string; is_available?: boolean; items?: { product_id: string; variant_id?: string; quantity: number }[] }) => {
      const { items, ...kitData } = kit;
      const { error } = await supabase.from('product_kits').update(kitData).eq('id', id);
      if (error) throw error;

      if (items) {
        await supabase.from('product_kit_items').delete().eq('kit_id', id);
        if (items.length > 0) {
          const { error: ie } = await supabase
            .from('product_kit_items')
            .insert(items.map(i => ({ ...i, kit_id: id })));
          if (ie) throw ie;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kits'] }),
  });
}

export function useDeleteKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_kits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kits'] }),
  });
}

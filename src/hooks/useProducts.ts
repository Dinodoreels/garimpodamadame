import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  gtin?: string | null;
  price: number;
  cost: number | null;
  compare_at_price: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  social_image_url?: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inventory_quantity: number;
  is_available: boolean;
  inventory_policy: string;
  volume_ml?: number | null;
  expiry_date?: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
  position: number;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  handle: string;
  product_type: string | null;
  vendor: string | null;
  manufacturer?: string | null;
  ncm?: string | null;
  cest?: string | null;
  fiscal_origin?: number | null;
  condition?: string;
  warranty_months?: number | null;
  marketplace_attributes?: unknown;
  suggestions_confirmed_at?: string | null;
  catalog_completeness?: number;
  catalog_pending_fields?: string[];
  price: number;
  compare_at_price: number | null;
  status: string;
  is_available: boolean;
  expiry_date?: string | null;
  is_lote?: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
  variants: ProductVariant[];
  options: ProductOption[];
  bling_links?: { id: string; bling_product_id: string | null; bling_sku: string | null; status: string; last_error?: string | null }[];
  tiktok_links?: { id: string; tiktok_product_id: string | null; tiktok_status: string | null; status: string; last_error: string | null }[];
  marketplace_publications?: { id: string; status: string; pending_fields: string[]; last_error: string | null; external_listing_id: string | null }[];
}

export function useProducts(limit: number = 500, searchQuery?: string) {
  return useQuery({
    queryKey: ['products', limit, searchQuery],
    queryFn: async () => {
      // Paginated fetch to bypass Supabase's 1000-row hard cap
      const PAGE_SIZE = 1000;
      const all: any[] = [];
      let from = 0;
      while (all.length < limit) {
        const to = Math.min(from + PAGE_SIZE - 1, limit - 1);
        let query = supabase
          .from('products')
          .select(`
            *,
            images:product_images(*),
            variants:product_variants(*),
            options:product_options(*)
          `)
          .eq('status', 'active')
          .order('position', { ascending: true })
          .range(from, to);

        if (searchQuery?.trim()) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching products:', error);
          throw error;
        }
        const batch = data || [];
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      // Sort images and options by position
      const today = new Date().toISOString().slice(0, 10);
      return all
        .filter((p: any) => !p.expiry_date || p.expiry_date >= today)
        .map(product => ({
          ...product,
          images: (product.images || []).sort((a: ProductImage, b: ProductImage) => a.position - b.position),
          options: (product.options || []).sort((a: ProductOption, b: ProductOption) => a.position - b.position),
        })) as Product[];
    },
  });
}

export function useProductByHandle(handle: string) {
  return useQuery({
    queryKey: ['product', handle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*),
          options:product_options(*)
        `)
        .eq('handle', handle)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        images: (data.images || []).sort((a: ProductImage, b: ProductImage) => a.position - b.position),
        options: (data.options || []).sort((a: ProductOption, b: ProductOption) => a.position - b.position),
      } as Product;
    },
    enabled: !!handle,
  });
}

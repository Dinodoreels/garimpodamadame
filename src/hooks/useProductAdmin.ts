import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Product, ProductImage, ProductVariant, ProductOption } from './useProducts';

export function useReorderProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('products').update({ position: index } as any).eq('id', id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Ordem dos produtos atualizada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reordenar', { description: error.message });
    },
  });
}

export interface ProductFormData {
  title: string;
  description?: string;
  handle?: string;
  product_type?: string;
  vendor?: string;
  manufacturer?: string;
  ncm?: string;
  cest?: string;
  fiscal_origin?: number | null;
  condition?: string;
  warranty_months?: number | null;
  marketplace_attributes?: Record<string, string>;
  suggestions_confirmed?: boolean;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  price: number;
  compare_at_price?: number;
  status?: 'active' | 'draft' | 'archived';
  is_available?: boolean;
  expiry_date?: string | null;
  is_lote?: boolean;
  images?: { url: string; alt_text?: string; position: number }[];
  variants?: {
    title: string;
    sku?: string;
    gtin?: string;
    price: number;
    compare_at_price?: number;
    cost?: number;
    option1?: string;
    option2?: string;
    option3?: string;
    inventory_quantity?: number;
    is_available?: boolean;
    inventory_policy?: string;
    volume_ml?: number | null;
    expiry_date?: string | null;
  }[];
  options?: {
    name: string;
    values: string[];
    position: number;
  }[];
}

// Generate URL-friendly handle from title
function generateHandle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function useAdminProducts(limit: number = 2000) {
  return useQuery({
    queryKey: ['admin-products', limit],
    queryFn: async () => {
      // Paginated fetch to bypass Supabase's 1000-row hard cap
      const PAGE_SIZE = 1000;
      const all: any[] = [];
      let from = 0;
      while (all.length < limit) {
        const to = Math.min(from + PAGE_SIZE - 1, limit - 1);
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            images:product_images(*),
            variants:product_variants(*),
            options:product_options(*),
            bling_links:bling_product_links(id, bling_product_id, bling_sku, status),
            tiktok_links:tiktok_product_links(id, tiktok_product_id, tiktok_status, status, last_error)
          `)
          .order('position', { ascending: true })
          .range(from, to);

        if (error) {
          console.error('Error fetching admin products:', error);
          throw error;
        }
        const batch = data || [];
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return all.map(product => ({
        ...product,
        images: (product.images || []).sort((a: ProductImage, b: ProductImage) => a.position - b.position),
        options: (product.options || []).sort((a: ProductOption, b: ProductOption) => a.position - b.position),
      })) as Product[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductFormData) => {
      const handle = data.handle || generateHandle(data.title);

      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          title: data.title,
          description: data.description || null,
          handle,
          product_type: data.product_type || null,
          vendor: data.vendor || null,
          manufacturer: data.manufacturer || null,
          ncm: data.ncm || null,
          cest: data.cest || null,
          fiscal_origin: data.fiscal_origin ?? null,
          condition: data.condition || 'new',
          warranty_months: data.warranty_months ?? null,
          marketplace_attributes: data.marketplace_attributes || {},
          suggestions_confirmed_at: data.suggestions_confirmed ? new Date().toISOString() : null,
          weight_grams: data.weight_grams ?? null,
          length_cm: data.length_cm ?? null,
          width_cm: data.width_cm ?? null,
          height_cm: data.height_cm ?? null,
          price: data.price,
          compare_at_price: data.compare_at_price || null,
          status: data.status || 'active',
          is_available: data.is_available ?? true,
          expiry_date: data.expiry_date || null,
          is_lote: data.is_lote ?? false,
        })
        .select()
        .single();

      if (productError) {
        console.error('Error creating product:', productError);
        throw new Error(productError.message);
      }

      // Create images
      if (data.images && data.images.length > 0) {
        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(
            data.images.map((img, index) => ({
              product_id: product.id,
              url: img.url,
              alt_text: img.alt_text || null,
              position: img.position ?? index,
            }))
          );

        if (imagesError) {
          console.error('Error creating images:', imagesError);
        }
      }

      // Create options
      if (data.options && data.options.length > 0) {
        const { error: optionsError } = await supabase
          .from('product_options')
          .insert(
            data.options.map((opt, index) => ({
              product_id: product.id,
              name: opt.name,
              values: opt.values,
              position: opt.position ?? index,
            }))
          );

        if (optionsError) {
          console.error('Error creating options:', optionsError);
        }
      }

      // Create variants
      if (data.variants && data.variants.length > 0) {
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(
            data.variants.map(v => ({
              product_id: product.id,
              title: v.title || 'Default',
              sku: v.sku || null,
              gtin: v.gtin || null,
              price: v.price,
              compare_at_price: v.compare_at_price || null,
              cost: v.cost || 0,
              option1: v.option1 || null,
              option2: v.option2 || null,
              option3: v.option3 || null,
              inventory_quantity: v.inventory_quantity ?? 0,
              is_available: (v.inventory_quantity ?? 0) > 0 || v.inventory_policy === 'continue',
              inventory_policy: v.inventory_policy || 'deny',
            volume_ml: v.volume_ml ?? null,
            expiry_date: v.expiry_date || null,
            }))
          );

        if (variantsError) {
          console.error('Error creating variants:', variantsError);
        }
      } else {
        // Create default variant if none provided
        const { error: defaultVariantError } = await supabase
          .from('product_variants')
          .insert({
            product_id: product.id,
            title: 'Default',
            price: data.price,
            inventory_quantity: 0,
            is_available: false,
            inventory_policy: 'deny',
          });

        if (defaultVariantError) {
          console.error('Error creating default variant:', defaultVariantError);
        }
      }

      await supabase.rpc('calculate_product_catalog_readiness', { target_product_id: product.id });
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar produto', { description: error.message });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      // Update product
      const { data: product, error: productError } = await supabase
        .from('products')
        .update({
          title: data.title,
          description: data.description || null,
          handle: data.handle || generateHandle(data.title),
          product_type: data.product_type || null,
          vendor: data.vendor || null,
          manufacturer: data.manufacturer || null,
          ncm: data.ncm || null,
          cest: data.cest || null,
          fiscal_origin: data.fiscal_origin ?? null,
          condition: data.condition || 'new',
          warranty_months: data.warranty_months ?? null,
          marketplace_attributes: data.marketplace_attributes || {},
          suggestions_confirmed_at: data.suggestions_confirmed ? new Date().toISOString() : null,
          weight_grams: data.weight_grams ?? null,
          length_cm: data.length_cm ?? null,
          width_cm: data.width_cm ?? null,
          height_cm: data.height_cm ?? null,
          price: data.price,
          compare_at_price: data.compare_at_price || null,
          status: data.status || 'active',
          is_available: data.is_available ?? true,
          expiry_date: data.expiry_date || null,
          is_lote: data.is_lote ?? false,
        })
        .eq('id', id)
        .select()
        .single();

      if (productError) {
        console.error('Error updating product:', productError);
        throw new Error(productError.message);
      }

      // Replace images
      if (data.images) {
        await supabase.from('product_images').delete().eq('product_id', id);
        
        if (data.images.length > 0) {
          await supabase.from('product_images').insert(
            data.images.map((img, index) => ({
              product_id: id,
              url: img.url,
              alt_text: img.alt_text || null,
              position: img.position ?? index,
            }))
          );
        }
      }

      // Replace options
      if (data.options) {
        await supabase.from('product_options').delete().eq('product_id', id);
        
        if (data.options.length > 0) {
          await supabase.from('product_options').insert(
            data.options.map((opt, index) => ({
              product_id: id,
              name: opt.name,
              values: opt.values,
              position: opt.position ?? index,
            }))
          );
        }
      }

      // Replace variants
      if (data.variants) {
        await supabase.from('product_variants').delete().eq('product_id', id);
        
        if (data.variants.length > 0) {
          await supabase.from('product_variants').insert(
            data.variants.map(v => ({
              product_id: id,
              title: v.title || 'Default',
              sku: v.sku || null,
              gtin: v.gtin || null,
              price: v.price,
              compare_at_price: v.compare_at_price || null,
              cost: v.cost || 0,
              option1: v.option1 || null,
              option2: v.option2 || null,
              option3: v.option3 || null,
              inventory_quantity: v.inventory_quantity ?? 0,
              is_available: (v.inventory_quantity ?? 0) > 0 || v.inventory_policy === 'continue',
              inventory_policy: v.inventory_policy || 'deny',
              volume_ml: v.volume_ml ?? null,
              expiry_date: v.expiry_date || null,
            }))
          );
        }
      }

      await supabase.rpc('calculate_product_catalog_readiness', { target_product_id: product.id });
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar produto', { description: error.message });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        throw new Error(error.message);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir produto', { description: error.message });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, updates }: { productId: string; updates: { variant_id: string; quantity: number }[] }) => {
      // Update each variant's inventory
      const results = await Promise.all(
        updates.map(u =>
          supabase.from('product_variants').update({ inventory_quantity: u.quantity, is_available: u.quantity > 0 }).eq('id', u.variant_id)
        )
      );
      const failed = results.find(r => r.error);
      if (failed?.error) throw new Error(failed.error.message);

      // Recalculate is_available for the product
      const totalStock = updates.reduce((sum, u) => sum + u.quantity, 0);
      const { error } = await supabase
        .from('products')
        .update({ is_available: totalStock > 0 })
        .eq('id', productId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Estoque atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar estoque', { description: error.message });
    },
  });
}

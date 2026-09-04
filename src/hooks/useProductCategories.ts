import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SizeType = 'none' | 'clothing' | 'shoes' | 'pants' | 'volume_ml';

export interface ProductCategory {
  id: string;
  value: string;
  label: string;
  has_sizes: boolean;
  size_type: SizeType;
  position: number;
  created_at: string;
  tracks_expiry?: boolean;
  expiry_alert_days?: number;
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return data as ProductCategory[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: { value: string; label: string; has_sizes: boolean; size_type?: SizeType; position: number; tracks_expiry?: boolean; expiry_alert_days?: number }) => {
      const { data, error } = await supabase
        .from('product_categories')
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Categoria criada!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar categoria');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; label?: string; value?: string; has_sizes?: boolean; size_type?: SizeType; position?: number; tracks_expiry?: boolean; expiry_alert_days?: number }) => {
      const { error } = await supabase
        .from('product_categories')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar categoria');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Categoria excluída!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao excluir categoria');
    },
  });
}

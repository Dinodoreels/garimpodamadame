import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  position: number;
  created_at: string;
}

export function useProductColors() {
  return useQuery({
    queryKey: ['product-colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_colors')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return data as ProductColor[];
    },
  });
}

export function useCreateColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (color: { name: string; hex: string; position: number }) => {
      const { data, error } = await supabase
        .from('product_colors')
        .insert(color)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-colors'] });
      toast.success('Cor criada!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar cor');
    },
  });
}

export function useDeleteColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_colors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-colors'] });
      toast.success('Cor excluída!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao excluir cor');
    },
  });
}

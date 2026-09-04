import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductLabel {
  id: string;
  label_number: number;
  product_id: string;
  variant_id: string | null;
  barcode_value: string;
  sku: string | null;
  product_title: string;
  variant_title: string | null;
  price: number;
  status: string;
  order_id: string | null;
  linked_at: string | null;
  printed_at: string | null;
  created_at: string | null;
}

interface SaveLabelInput {
  label_number: number;
  product_id: string;
  variant_id?: string | null;
  barcode_value: string;
  sku?: string | null;
  product_title: string;
  variant_title?: string | null;
  price?: number;
}

export function useSavePrintedLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labels: SaveLabelInput[]) => {
      const { error } = await supabase
        .from('product_labels')
        .insert(labels.map(l => ({
          label_number: l.label_number,
          product_id: l.product_id,
          variant_id: l.variant_id || null,
          barcode_value: l.barcode_value,
          sku: l.sku || null,
          product_title: l.product_title,
          variant_title: l.variant_title || null,
          price: l.price || 0,
          status: 'available',
        })));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-labels'] });
      toast.success('Etiquetas registradas no estoque');
    },
    onError: () => {
      toast.error('Erro ao registrar etiquetas');
    },
  });
}

export function useFindLabelByBarcode() {
  return useMutation({
    mutationFn: async (barcode: string) => {
      const { data, error } = await supabase
        .from('product_labels')
        .select('*')
        .eq('barcode_value', barcode)
        .eq('status', 'available')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ProductLabel | null;
    },
  });
}

export function useLinkLabelToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ labelId, orderId }: { labelId: string; orderId: string }) => {
      const { error } = await supabase
        .from('product_labels')
        .update({
          order_id: orderId,
          status: 'sold',
          linked_at: new Date().toISOString(),
        })
        .eq('id', labelId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['product-labels'] });
      queryClient.invalidateQueries({ queryKey: ['order-labels', vars.orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Peça vinculada ao pedido');
    },
    onError: () => {
      toast.error('Erro ao vincular peça');
    },
  });
}

export function useUnlinkLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ labelId, orderId }: { labelId: string; orderId: string }) => {
      const { error } = await supabase
        .from('product_labels')
        .update({
          order_id: null,
          status: 'available',
          linked_at: null,
        })
        .eq('id', labelId);
      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['product-labels'] });
      queryClient.invalidateQueries({ queryKey: ['order-labels', orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Peça desvinculada');
    },
    onError: () => {
      toast.error('Erro ao desvincular peça');
    },
  });
}

export function useMarkLabelSold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ labelId, description }: { labelId: string; description?: string }) => {
      const { error } = await supabase
        .from('product_labels')
        .update({
          status: 'sold',
          linked_at: new Date().toISOString(),
        })
        .eq('id', labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-labels'] });
      toast.success('Etiqueta marcada como vendida');
    },
    onError: () => {
      toast.error('Erro ao registrar venda da etiqueta');
    },
  });
}

export function useLabelsByOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['order-labels', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('product_labels')
        .select('*')
        .eq('order_id', orderId)
        .order('label_number');
      if (error) throw error;
      return (data || []) as ProductLabel[];
    },
    enabled: !!orderId,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Refund {
  id: string;
  order_id: string;
  user_id: string | null;
  amount: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  provider_refund_id: string | null;
  provider_status: string | null;
  confirmed_amount: number | null;
  refund_type: string | null;
  workflow_results: Record<string, any>;
  last_error: string | null;
}

export function useRefundsByOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['refunds', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('refunds' as any)
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Refund[];
    },
    enabled: !!orderId,
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, amount, reason }: { orderId: string; amount: number; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor válido');
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('total, paid_amount')
        .eq('id', orderId)
        .single();
      if (orderError) throw orderError;
      const { data: prior } = await supabase
        .from('refunds' as any)
        .select('confirmed_amount')
        .eq('order_id', orderId)
        .in('status', ['completed', 'partial']);
      const used = ((prior || []) as any[]).reduce((sum, item) => sum + Number(item.confirmed_amount || 0), 0);
      const available = Number(order.paid_amount ?? order.total) - used;
      if (amount > available + 0.01) throw new Error(`O saldo disponível para reembolso é R$ ${available.toFixed(2).replace('.', ',')}`);

      const { error } = await supabase
        .from('refunds' as any)
        .insert({
          order_id: orderId,
          user_id: user?.id,
          amount,
          reason,
          status: 'pending',
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['refunds', orderId] });
      toast.success('Reembolso solicitado com sucesso');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao solicitar reembolso');
    },
  });
}

export function useUpdateRefundStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      refundId,
      status,
      adminNotes,
      orderId,
    }: {
      refundId: string;
      status: string;
      adminNotes?: string;
      orderId: string;
    }) => {
      const action = status === 'rejected' ? 'reject' : 'approve';
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { action, refund_id: refundId, admin_notes: adminNotes },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível processar o reembolso');
      return data;
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['refunds', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      toast.success('Reembolso atualizado com segurança');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar reembolso');
    },
  });
}

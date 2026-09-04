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
    onError: () => {
      toast.error('Erro ao solicitar reembolso');
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const update: any = {
        status,
        processed_by: user?.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (adminNotes !== undefined) update.admin_notes = adminNotes;

      const { error } = await supabase
        .from('refunds' as any)
        .update(update)
        .eq('id', refundId);
      if (error) throw error;

      // If approved/completed, update order status
      if (status === 'approved' || status === 'completed') {
        await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('id', orderId);
      }
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['refunds', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      toast.success('Status do reembolso atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar reembolso');
    },
  });
}

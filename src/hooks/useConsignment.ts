import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConsignmentItem {
  id: string;
  supplier_id: string;
  product_id: string;
  variant_id: string | null;
  quantity_received: number;
  quantity_sold: number;
  quantity_returned: number;
  unit_cost: number;
  received_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: { name: string };
  products?: { title: string };
  product_variants?: { title: string } | null;
}

export function useConsignmentItems(supplierId?: string) {
  return useQuery({
    queryKey: ['consignment-items', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('consignment_items')
        .select('*, suppliers(name), products(title), product_variants(title)')
        .order('created_at', { ascending: false });
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ConsignmentItem[];
    },
  });
}

export interface ConsignmentStats {
  supplier_id: string;
  supplier_name: string;
  total_received: number;
  total_sold: number;
  total_returned: number;
  in_stock: number;
}

export function useConsignmentStats() {
  return useQuery({
    queryKey: ['consignment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consignment_items')
        .select('supplier_id, quantity_received, quantity_sold, quantity_returned, suppliers(name)');
      if (error) throw error;

      const statsMap = new Map<string, ConsignmentStats>();
      for (const item of data as any[]) {
        const existing = statsMap.get(item.supplier_id);
        if (existing) {
          existing.total_received += item.quantity_received;
          existing.total_sold += item.quantity_sold;
          existing.total_returned += item.quantity_returned;
          existing.in_stock = existing.total_received - existing.total_sold - existing.total_returned;
        } else {
          statsMap.set(item.supplier_id, {
            supplier_id: item.supplier_id,
            supplier_name: item.suppliers?.name || 'Desconhecido',
            total_received: item.quantity_received,
            total_sold: item.quantity_sold,
            total_returned: item.quantity_returned,
            in_stock: item.quantity_received - item.quantity_sold - item.quantity_returned,
          });
        }
      }
      return Array.from(statsMap.values());
    },
  });
}

export interface FinancialStats {
  supplier_id: string;
  supplier_name: string;
  in_stock: number;
  total_sold: number;
  amount_owed: number;
  amount_paid: number;
  balance: number;
}

export function useConsignmentFinancials() {
  return useQuery({
    queryKey: ['consignment-financials'],
    queryFn: async () => {
      const [itemsRes, paymentsRes] = await Promise.all([
        supabase
          .from('consignment_items')
          .select('supplier_id, quantity_received, quantity_sold, quantity_returned, unit_cost, suppliers(name)'),
        supabase
          .from('supplier_payments')
          .select('supplier_id, amount'),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const paymentsMap = new Map<string, number>();
      for (const p of paymentsRes.data as any[]) {
        paymentsMap.set(p.supplier_id, (paymentsMap.get(p.supplier_id) || 0) + Number(p.amount));
      }

      const statsMap = new Map<string, FinancialStats>();
      for (const item of itemsRes.data as any[]) {
        const existing = statsMap.get(item.supplier_id);
        const sold = item.quantity_sold;
        const inStock = item.quantity_received - item.quantity_sold - item.quantity_returned;
        const owed = sold * Number(item.unit_cost || 0);

        if (existing) {
          existing.total_sold += sold;
          existing.in_stock += inStock;
          existing.amount_owed += owed;
        } else {
          statsMap.set(item.supplier_id, {
            supplier_id: item.supplier_id,
            supplier_name: item.suppliers?.name || 'Desconhecido',
            in_stock: inStock,
            total_sold: sold,
            amount_owed: owed,
            amount_paid: 0,
            balance: 0,
          });
        }
      }

      for (const [sid, stats] of statsMap) {
        stats.amount_paid = paymentsMap.get(sid) || 0;
        stats.balance = stats.amount_owed - stats.amount_paid;
      }

      return Array.from(statsMap.values());
    },
  });
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_period: string | null;
  notes: string | null;
  created_at: string;
}

export function useSupplierPayments(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-payments', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (supplierId) query = query.eq('supplier_id', supplierId);
      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierPayment[];
    },
  });
}

export function useCreateSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: {
      supplier_id: string;
      amount: number;
      payment_date: string;
      payment_method?: string;
      reference_period?: string;
      notes?: string;
      create_expense?: boolean;
      supplier_name?: string;
    }) => {
      const { create_expense, supplier_name, ...paymentData } = payment;
      const { data, error } = await supabase
        .from('supplier_payments')
        .insert(paymentData)
        .select()
        .single();
      if (error) throw error;

      if (create_expense) {
        await supabase.from('expenses').insert({
          description: `Pagamento consignação — ${supplier_name || 'Fornecedor'}`,
          amount: payment.amount,
          due_date: payment.payment_date,
          paid_at: new Date().toISOString(),
          notes: payment.notes || `Ref: ${payment.reference_period || 'N/A'}`,
          supplier: supplier_name || undefined,
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-payments'] });
      qc.invalidateQueries({ queryKey: ['consignment-financials'] });
      toast.success('Pagamento registrado!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao registrar pagamento'),
  });
}

export function useCreateConsignmentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      supplier_id: string;
      product_id: string;
      variant_id?: string;
      quantity_received: number;
      unit_cost?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('consignment_items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignment-items'] });
      qc.invalidateQueries({ queryKey: ['consignment-stats'] });
      qc.invalidateQueries({ queryKey: ['consignment-financials'] });
      toast.success('Entrada de consignação registrada!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao registrar consignação'),
  });
}

export function useUpdateConsignmentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; quantity_sold?: number; quantity_returned?: number; notes?: string }) => {
      const { error } = await supabase.from('consignment_items').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignment-items'] });
      qc.invalidateQueries({ queryKey: ['consignment-stats'] });
      qc.invalidateQueries({ queryKey: ['consignment-financials'] });
      toast.success('Consignação atualizada!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar consignação'),
  });
}

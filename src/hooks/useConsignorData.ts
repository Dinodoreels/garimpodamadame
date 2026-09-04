import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth } from 'date-fns';

/** Returns the supplier record linked to the logged-in consignor user. */
export function useConsignorSupplier() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['consignor-supplier', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export interface ConsignorPiece {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_title: string;
  variant_title: string | null;
  quantity_received: number;
  quantity_sold: number;
  quantity_returned: number;
  in_stock: number;
  unit_cost: number;
  received_at: string;
}

export function useConsignorItems() {
  const { data: supplier } = useConsignorSupplier();
  return useQuery({
    queryKey: ['consignor-items', supplier?.id],
    enabled: !!supplier?.id,
    queryFn: async (): Promise<ConsignorPiece[]> => {
      const { data, error } = await supabase
        .from('consignment_items')
        .select('*, products(title), product_variants(title)')
        .eq('supplier_id', supplier!.id)
        .order('received_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((i: any) => ({
        id: i.id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_title: i.products?.title || 'Produto',
        variant_title: i.product_variants?.title || null,
        quantity_received: i.quantity_received,
        quantity_sold: i.quantity_sold,
        quantity_returned: i.quantity_returned,
        in_stock: i.quantity_received - i.quantity_sold - i.quantity_returned,
        unit_cost: Number(i.unit_cost) || 0,
        received_at: i.received_at,
      }));
    },
  });
}

export interface ConsignorSale {
  order_id: string;
  order_number: string;
  product_title: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  total_cost: number;
  paid_at: string;
}

/** Sales of consignor's products in a given month range. */
export function useConsignorSales(year: number, month: number) {
  const { data: supplier } = useConsignorSupplier();
  return useQuery({
    queryKey: ['consignor-sales', supplier?.id, year, month],
    enabled: !!supplier?.id,
    queryFn: async (): Promise<ConsignorSale[]> => {
      const start = startOfMonth(new Date(year, month - 1, 1)).toISOString();
      const end = endOfMonth(new Date(year, month - 1, 1)).toISOString();

      // Orders in period (RLS already filters to those containing supplier products)
      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('id, order_number, paid_at')
        .gte('paid_at', start)
        .lte('paid_at', end)
        .not('paid_at', 'is', null);
      if (oErr) throw oErr;
      if (!orders || orders.length === 0) return [];

      const orderMap = new Map(orders.map(o => [o.id, o]));
      const orderIds = orders.map(o => o.id);

      // Items (RLS filters to supplier's products)
      const { data: items, error: iErr } = await supabase
        .from('order_items')
        .select('order_id, product_id, product_title, variant_title, quantity, unit_price, total_price')
        .in('order_id', orderIds);
      if (iErr) throw iErr;

      // Lookup unit_cost from consignment_items
      const { data: consignItems } = await supabase
        .from('consignment_items')
        .select('product_id, variant_id, unit_cost')
        .eq('supplier_id', supplier!.id);
      const costMap = new Map<string, number>();
      (consignItems || []).forEach((c: any) => {
        costMap.set(c.product_id, Number(c.unit_cost) || 0);
      });

      return (items || []).map((i: any) => {
        const order = orderMap.get(i.order_id)!;
        const unitCost = costMap.get(i.product_id) || 0;
        return {
          order_id: i.order_id,
          order_number: order.order_number,
          product_title: i.product_title,
          variant_title: i.variant_title,
          quantity: i.quantity,
          unit_price: Number(i.unit_price) || 0,
          unit_cost: unitCost,
          total_price: Number(i.total_price) || 0,
          total_cost: unitCost * i.quantity,
          paid_at: order.paid_at,
        };
      });
    },
  });
}

export function useConsignorPayments() {
  const { data: supplier } = useConsignorSupplier();
  return useQuery({
    queryKey: ['consignor-payments', supplier?.id],
    enabled: !!supplier?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*')
        .eq('supplier_id', supplier!.id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

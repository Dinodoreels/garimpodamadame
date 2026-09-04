import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';

export interface InventoryClosing {
  id: string;
  year: number;
  month: number;
  store_id: string | null;
  closed_at: string;
  closed_by: string;
  total_units: number;
  total_cost_value: number;
  total_retail_value: number;
  notes: string | null;
}

export interface InventoryClosingItem {
  id: string;
  closing_id: string;
  product_id: string;
  variant_id: string | null;
  product_title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_retail: number;
}

export interface InventoryRowDetail {
  variant_id: string;
  product_title: string;
  variant_title: string | null;
  sku: string | null;
  initial: number;
  sold: number;
  current: number;
  divergence: number;
  unit_cost: number;
  unit_price: number;
}

export interface InventoryClosingMonth {
  year: number;
  month: number;
  closing: InventoryClosing | null;
  previous: InventoryClosing | null;
  hasBaseline: boolean;
  rows: InventoryRowDetail[];
  totals: {
    units: number;
    cost_value: number;
    retail_value: number;
  };
}

/** Loads month data: snapshot if closed, live inventory if not, and computes diffs vs previous month. */
export function useInventoryClosingMonth(year: number, month: number, storeId: string | null = null) {
  return useQuery({
    queryKey: ['inventory-closing-month', year, month, storeId],
    queryFn: async (): Promise<InventoryClosingMonth> => {
      // Find current month's closing
      const closingQuery = supabase
        .from('inventory_closings')
        .select('*')
        .eq('year', year)
        .eq('month', month);
      if (storeId) closingQuery.eq('store_id', storeId);
      else closingQuery.is('store_id', null);
      const { data: closing } = await closingQuery.maybeSingle();

      // Find previous month's closing
      const prev = subMonths(new Date(year, month - 1, 1), 1);
      const prevQuery = supabase
        .from('inventory_closings')
        .select('*')
        .eq('year', prev.getFullYear())
        .eq('month', prev.getMonth() + 1);
      if (storeId) prevQuery.eq('store_id', storeId);
      else prevQuery.is('store_id', null);
      const { data: previous } = await prevQuery.maybeSingle();

      // Previous snapshot items (for "estoque inicial")
      let prevItems: InventoryClosingItem[] = [];
      if (previous) {
        const { data } = await supabase
          .from('inventory_closing_items')
          .select('*')
          .eq('closing_id', previous.id);
        prevItems = (data || []) as InventoryClosingItem[];
      }
      const prevByVariant = new Map<string, number>();
      prevItems.forEach(i => {
        if (i.variant_id) prevByVariant.set(i.variant_id, i.quantity);
      });

      // Current snapshot items (if closed)
      let currentItems: InventoryClosingItem[] = [];
      if (closing) {
        const { data } = await supabase
          .from('inventory_closing_items')
          .select('*')
          .eq('closing_id', closing.id);
        currentItems = (data || []) as InventoryClosingItem[];
      }

      // Live variants (for open month)
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, product_id, title, sku, price, cost, inventory_quantity, products!inner(title, status)')
        .eq('products.status', 'active');

      // Sales in the month
      const monthStart = startOfMonth(new Date(year, month - 1, 1)).toISOString();
      const monthEnd = endOfMonth(new Date(year, month - 1, 1)).toISOString();
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('id')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd)
        .not('paid_at', 'is', null);
      const orderIds = (paidOrders || []).map(o => o.id);

      const soldByVariant = new Map<string, number>();
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('variant_id, quantity')
          .in('order_id', orderIds);
        (items || []).forEach(i => {
          if (i.variant_id) soldByVariant.set(i.variant_id, (soldByVariant.get(i.variant_id) || 0) + (i.quantity || 0));
        });
      }

      // Build rows
      const rows: InventoryRowDetail[] = [];
      let totalUnits = 0, totalCost = 0, totalRetail = 0;

      if (closing && currentItems.length > 0) {
        // Use snapshot
        for (const item of currentItems) {
          if (!item.variant_id) continue;
          const initial = prevByVariant.get(item.variant_id) || 0;
          const sold = soldByVariant.get(item.variant_id) || 0;
          const current = item.quantity;
          rows.push({
            variant_id: item.variant_id,
            product_title: item.product_title,
            variant_title: item.variant_title,
            sku: item.sku,
            initial,
            sold,
            current,
            divergence: initial - sold - current,
            unit_cost: item.unit_cost,
            unit_price: item.unit_price,
          });
          totalUnits += current;
          totalCost += item.total_cost;
          totalRetail += item.total_retail;
        }
      } else {
        // Live data
        for (const v of (variants || [])) {
          const initial = prevByVariant.get(v.id) || 0;
          const sold = soldByVariant.get(v.id) || 0;
          const current = v.inventory_quantity || 0;
          const cost = Number(v.cost) || 0;
          const price = Number(v.price) || 0;
          rows.push({
            variant_id: v.id,
            product_title: (v.products as any).title,
            variant_title: v.title,
            sku: v.sku,
            initial,
            sold,
            current,
            divergence: initial - sold - current,
            unit_cost: cost,
            unit_price: price,
          });
          totalUnits += current;
          totalCost += current * cost;
          totalRetail += current * price;
        }
      }

      // Sort by absolute divergence then by current desc
      rows.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence) || b.current - a.current);

      return {
        year,
        month,
        closing: (closing as InventoryClosing) || null,
        previous: (previous as InventoryClosing) || null,
        hasBaseline: !!previous,
        rows,
        totals: { units: totalUnits, cost_value: totalCost, retail_value: totalRetail },
      };
    },
  });
}

export function useCloseInventoryMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month, storeId, notes }: { year: number; month: number; storeId: string | null; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Snapshot live variants
      const { data: variants, error: vErr } = await supabase
        .from('product_variants')
        .select('id, product_id, title, sku, price, cost, inventory_quantity, products!inner(title, status)')
        .eq('products.status', 'active');
      if (vErr) throw vErr;

      let totalUnits = 0, totalCost = 0, totalRetail = 0;
      const items = (variants || []).map(v => {
        const qty = v.inventory_quantity || 0;
        const cost = Number(v.cost) || 0;
        const price = Number(v.price) || 0;
        totalUnits += qty;
        totalCost += qty * cost;
        totalRetail += qty * price;
        return {
          product_id: v.product_id,
          variant_id: v.id,
          product_title: (v.products as any).title,
          variant_title: v.title,
          sku: v.sku,
          quantity: qty,
          unit_cost: cost,
          unit_price: price,
          total_cost: qty * cost,
          total_retail: qty * price,
        };
      });

      const { data: closing, error: cErr } = await supabase
        .from('inventory_closings')
        .insert({
          year, month, store_id: storeId,
          closed_by: user.id,
          total_units: totalUnits,
          total_cost_value: totalCost,
          total_retail_value: totalRetail,
          notes: notes || null,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      if (items.length > 0) {
        const itemsWithClosing = items.map(i => ({ ...i, closing_id: closing.id }));
        const { error: iErr } = await supabase.from('inventory_closing_items').insert(itemsWithClosing);
        if (iErr) throw iErr;
      }
      return closing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-closing-month'] });
      toast.success('Estoque fechado com sucesso');
    },
    onError: (err: any) => {
      const msg = err?.message?.includes('duplicate') ? 'Este mês já foi fechado para esta loja' : (err?.message || 'Erro ao fechar estoque');
      toast.error(msg);
    },
  });
}

export function useReopenInventoryMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (closingId: string) => {
      const { error } = await supabase.from('inventory_closings').delete().eq('id', closingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-closing-month'] });
      toast.success('Mês reaberto');
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao reabrir mês'),
  });
}

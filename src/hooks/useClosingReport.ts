import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO, subDays, subWeeks, subMonths, differenceInMilliseconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ClosingFilters {
  period: PeriodType;
  date: Date;
  sellerId?: string;
  storeId?: string;
  customRange?: { start: Date; end: Date };
}

export interface ProductDetail {
  productId: string;
  productTitle: string;
  unitPrice: number;
  quantity: number;
  total: number;
  source: string;
  sellerName: string | null;
}

export interface SourceSummary {
  source: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface SellerSummary {
  sellerId: string;
  name: string;
  orders: number;
  revenue: number;
}

export interface ClosingOrder {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
  status: string;
  source: string;
  customerName: string;
  sellerName: string | null;
  paymentMethod: string | null;
}

export interface PaymentMethodSummary {
  method: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productTitle: string;
  quantity: number;
  revenue: number;
}

export interface PeriodSummary {
  revenue: number;
  ordersCount: number;
  averageTicket: number;
  unitsSold: number;
  grossProfit: number;
  margin: number;
}

export interface ClosingReportData {
  summary: PeriodSummary;
  previousSummary: PeriodSummary | null;
  productDetails: ProductDetail[];
  bySource: SourceSummary[];
  bySeller: SellerSummary[];
  byPaymentMethod: PaymentMethodSummary[];
  topProducts: TopProduct[];
  orders: ClosingOrder[];
  sellers: { id: string; name: string }[];
  storesList: { id: string; name: string }[];
}

function getDateRange(period: PeriodType, date: Date, custom?: { start: Date; end: Date }) {
  switch (period) {
    case 'daily':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'weekly':
      return { start: startOfWeek(date, { locale: ptBR }), end: endOfWeek(date, { locale: ptBR }) };
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case 'custom':
      return { start: startOfDay(custom?.start || date), end: endOfDay(custom?.end || date) };
  }
}

function getPreviousRange(period: PeriodType, date: Date, current: { start: Date; end: Date }) {
  switch (period) {
    case 'daily': {
      const d = subDays(date, 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case 'weekly': {
      const d = subWeeks(date, 1);
      return { start: startOfWeek(d, { locale: ptBR }), end: endOfWeek(d, { locale: ptBR }) };
    }
    case 'monthly': {
      const d = subMonths(date, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    case 'custom': {
      const ms = differenceInMilliseconds(current.end, current.start);
      const end = new Date(current.start.getTime() - 1);
      const start = new Date(end.getTime() - ms);
      return { start, end };
    }
  }
}

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site',
  whatsapp: 'WhatsApp',
  store: 'Loja Física',
  manual: 'Manual',
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão Crédito',
  debit_card: 'Cartão Débito',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  transfer: 'Transferência',
  other: 'Outro',
};

const VALID_STATUSES = ['paid', 'shipped', 'delivered'];

async function computeSummaryAndAggregates(
  start: Date,
  end: Date,
  filters: { sellerId?: string; storeId?: string },
  variantCostMap: Map<string, number>,
) {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, total, created_at, status, source, payment_method, created_by, user_id, store_id')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .in('status', VALID_STATUSES)
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;

  const orderIds = (orders || []).map((order) => order.id);
  const { data: orderItems, error: itemsError } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('order_id, variant_id, quantity')
        .in('order_id', orderIds)
    : { data: [], error: null };

  if (itemsError) throw itemsError;

  const itemsByOrder = new Map<string, { variant_id: string | null; quantity: number }[]>();
  (orderItems || []).forEach((item: any) => {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  });

  const raw = orders || [];
  let filtered = filters.sellerId ? raw.filter(o => o.created_by === filters.sellerId) : raw;
  if (filters.storeId) filtered = filtered.filter((o: any) => o.store_id === filters.storeId);

  let revenue = 0;
  let unitsSold = 0;
  let cogs = 0;
  filtered.forEach((o: any) => {
    revenue += Number(o.total);
    (itemsByOrder.get(o.id) || []).forEach((it: any) => {
      unitsSold += it.quantity || 0;
      const cost = it.variant_id ? (variantCostMap.get(it.variant_id) || 0) : 0;
      cogs += cost * (it.quantity || 0);
    });
  });
  const grossProfit = revenue - cogs;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const summary: PeriodSummary = {
    revenue,
    ordersCount: filtered.length,
    averageTicket: filtered.length > 0 ? revenue / filtered.length : 0,
    unitsSold,
    grossProfit,
    margin,
  };
  return { summary, orders: filtered, raw };
}

export function useClosingReport(filters: ClosingFilters) {
  const { start, end } = getDateRange(filters.period, filters.date, filters.customRange);
  const previousRange = getPreviousRange(filters.period, filters.date, { start, end });

  return useQuery({
    queryKey: ['closing-report-v2', filters.period, start.toISOString(), end.toISOString(), filters.sellerId || 'all', filters.storeId || 'all'],
    queryFn: async (): Promise<ClosingReportData> => {
      // Fetch all variant costs upfront (small enough table for store)
      const { data: variantsCost } = await supabase
        .from('product_variants')
        .select('id, cost');
      const variantCostMap = new Map<string, number>();
      (variantsCost || []).forEach((v: any) => variantCostMap.set(v.id, Number(v.cost) || 0));

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, total, created_at, status, source, payment_method, created_by, user_id, store_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .in('status', VALID_STATUSES)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orderIds = (orders || []).map((order) => order.id);
      const { data: orderItems, error: orderItemsError } = orderIds.length > 0
        ? await supabase
            .from('order_items')
            .select('order_id, product_id, variant_id, product_title, unit_price, quantity, total_price')
            .in('order_id', orderIds)
        : { data: [], error: null };

      if (orderItemsError) throw orderItemsError;

      const itemsByOrder = new Map<string, any[]>();
      (orderItems || []).forEach((item: any) => {
        const list = itemsByOrder.get(item.order_id) || [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      });

      // Fetch seller names for orders with created_by
      const sellerIds = [...new Set((orders || []).map(o => o.created_by).filter(Boolean))] as string[];
      const customerIds = [...new Set((orders || []).map(o => o.user_id).filter(Boolean))] as string[];
      let sellerMap = new Map<string, string>();
      let customerMap = new Map<string, string>();
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', sellerIds);
        sellers?.forEach(s => sellerMap.set(s.id, s.full_name || 'Vendedor'));
      }
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', customerIds);
        customers?.forEach(c => customerMap.set(c.id, c.full_name || 'Cliente'));
      }

      // Build sellers list from ALL orders (before filtering)
      const allOrdersRaw = orders || [];
      const sellersMap = new Map<string, string>();
      allOrdersRaw.forEach(o => {
        if (o.created_by) {
          sellersMap.set(o.created_by, sellerMap.get(o.created_by) || 'Vendedor');
        }
      });
      const sellers = Array.from(sellersMap.entries()).map(([id, name]) => ({ id, name }));

      // Build stores list from ALL orders (before filtering)
      const storeIds = [...new Set(allOrdersRaw.map((o: any) => o.store_id).filter(Boolean))] as string[];
      let storesList: { id: string; name: string }[] = [];
      if (storeIds.length > 0) {
        const { data: storesData } = await supabase.from('stores').select('id, name').in('id', storeIds);
        storesList = (storesData || []).map(s => ({ id: s.id, name: s.name }));
      }

      // Filter by seller and store if active
      let allOrders = filters.sellerId
        ? allOrdersRaw.filter(o => o.created_by === filters.sellerId)
        : allOrdersRaw;
      if (filters.storeId) {
        allOrders = allOrders.filter((o: any) => o.store_id === filters.storeId);
      }

      // Summary
      const revenue = allOrders.reduce((s, o) => s + Number(o.total), 0);
      const ordersCount = allOrders.length;
      const averageTicket = ordersCount > 0 ? revenue / ordersCount : 0;
      const unitsSold = allOrders.reduce((s, o) => {
        const items = itemsByOrder.get(o.id) || [];
        return s + (items?.reduce((a: number, i: any) => a + i.quantity, 0) || 0);
      }, 0);
      let cogs = 0;
      allOrders.forEach((o: any) => {
        (itemsByOrder.get(o.id) || []).forEach((it: any) => {
          const cost = it.variant_id ? (variantCostMap.get(it.variant_id) || 0) : 0;
          cogs += cost * (it.quantity || 0);
        });
      });
      const grossProfit = revenue - cogs;
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      // Product details (one row per item per order)
      const productDetails: ProductDetail[] = [];
      allOrders.forEach(order => {
        const items = itemsByOrder.get(order.id) || [];
        const src = order.source || 'website';
        const seller = order.created_by ? (sellerMap.get(order.created_by) || 'Vendedor') : null;
        items?.forEach(item => {
          productDetails.push({
            productId: item.product_id || '',
            productTitle: item.product_title,
            unitPrice: Number(item.unit_price),
            quantity: item.quantity,
            total: Number(item.total_price),
            source: src,
            sellerName: seller,
          });
        });
      });

      // Top products
      const productAgg = new Map<string, TopProduct>();
      productDetails.forEach(p => {
        const key = p.productId || p.productTitle;
        const ex = productAgg.get(key) || { productId: p.productId, productTitle: p.productTitle, quantity: 0, revenue: 0 };
        productAgg.set(key, { ...ex, quantity: ex.quantity + p.quantity, revenue: ex.revenue + p.total });
      });
      const topProducts = Array.from(productAgg.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      // By source
      const sourceMap = new Map<string, { orders: number; revenue: number }>();
      allOrders.forEach(o => {
        const src = o.source || 'website';
        const ex = sourceMap.get(src) || { orders: 0, revenue: 0 };
        sourceMap.set(src, { orders: ex.orders + 1, revenue: ex.revenue + Number(o.total) });
      });
      const bySource: SourceSummary[] = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        label: SOURCE_LABELS[source] || source,
        ...data,
      }));

      // By payment method
      const pmMap = new Map<string, { orders: number; revenue: number }>();
      allOrders.forEach((o: any) => {
        const m = o.payment_method || 'other';
        const ex = pmMap.get(m) || { orders: 0, revenue: 0 };
        pmMap.set(m, { orders: ex.orders + 1, revenue: ex.revenue + Number(o.total) });
      });
      const byPaymentMethod: PaymentMethodSummary[] = Array.from(pmMap.entries()).map(([method, data]) => ({
        method,
        label: PAYMENT_LABELS[method] || method,
        ...data,
      })).sort((a, b) => b.revenue - a.revenue);

      // By seller
      const sellerAgg = new Map<string, { name: string; orders: number; revenue: number }>();
      allOrders.forEach(o => {
        if (!o.created_by) return;
        const name = sellerMap.get(o.created_by) || 'Vendedor';
        const ex = sellerAgg.get(o.created_by) || { name, orders: 0, revenue: 0 };
        sellerAgg.set(o.created_by, { name, orders: ex.orders + 1, revenue: ex.revenue + Number(o.total) });
      });
      const bySeller: SellerSummary[] = Array.from(sellerAgg.entries()).map(([sellerId, data]) => ({
        sellerId,
        ...data,
      }));

      // Orders list
      const formattedOrders: ClosingOrder[] = allOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        total: Number(o.total),
        created_at: o.created_at,
        status: o.status,
        source: o.source || 'website',
        customerName: o.user_id ? (customerMap.get(o.user_id) || 'Cliente') : 'Cliente',
        sellerName: o.created_by ? (sellerMap.get(o.created_by) || 'Vendedor') : null,
        paymentMethod: (o as any).payment_method || null,
      }));

      const summary: PeriodSummary = { revenue, ordersCount, averageTicket, unitsSold, grossProfit, margin };

      // Previous period summary (lightweight)
      let previousSummary: PeriodSummary | null = null;
      try {
        const prev = await computeSummaryAndAggregates(
          previousRange.start,
          previousRange.end,
          { sellerId: filters.sellerId, storeId: filters.storeId },
          variantCostMap,
        );
        previousSummary = prev.summary;
      } catch {
        previousSummary = null;
      }

      return {
        summary,
        previousSummary,
        productDetails,
        bySource,
        bySeller,
        byPaymentMethod,
        topProducts,
        orders: formattedOrders,
        sellers,
        storesList,
      };
    },
    retry: 1,
  });
}

export { PAYMENT_LABELS, SOURCE_LABELS };

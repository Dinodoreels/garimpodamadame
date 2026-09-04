import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, addDays } from 'date-fns';

export interface FinanceSummary {
  revenue: number;
  productCosts: number;
  grossProfit: number;
  expenses: number;
  pendingExpenses: number;
  totalExpenses: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  ordersCount: number;
  averageOrderValue: number;
  previousRevenue: number;
  previousOrders: number;
  previousAverage: number;
  revenueGrowth: number;
  ordersGrowth: number;
  averageGrowth: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ProductProfitability {
  id: string;
  title: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity: number;
}

export interface CashFlowProjection {
  expectedRevenue: number;
  expectedExpenses: number;
  projectedBalance: number;
  pendingOrdersCount: number;
  upcomingExpensesCount: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  amount: number;
  count: number;
  percent: number;
}

export interface ExpenseByCategory {
  categoryId: string | null;
  name: string;
  color: string;
  amount: number;
  count: number;
  percent: number;
}

export interface RevenueBySource {
  source: string;
  label: string;
  amount: number;
  count: number;
}

export type FinancePeriod = 'current' | 'last' | 'year' | 'custom';

export function useFinance(
  period: FinancePeriod = 'current',
  customRange?: { start: Date; end: Date }
) {
  const today = new Date();

  let startDate: Date;
  let endDate: Date;

  if (period === 'current') {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
  } else if (period === 'last') {
    const lastMonth = subMonths(today, 1);
    startDate = startOfMonth(lastMonth);
    endDate = endOfMonth(lastMonth);
  } else if (period === 'year') {
    startDate = new Date(today.getFullYear(), 0, 1);
    endDate = new Date(today.getFullYear(), 11, 31);
  } else {
    startDate = customRange?.start ?? startOfMonth(today);
    endDate = customRange?.end ?? endOfMonth(today);
  }

  const periodKey =
    period === 'custom'
      ? `custom:${startDate.toISOString()}:${endDate.toISOString()}`
      : period;

  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousStartDate = new Date(startDate.getTime() - periodDuration - 86400000);
  const previousEndDate = new Date(startDate.getTime() - 86400000);

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Finance summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', periodKey],
    queryFn: async (): Promise<FinanceSummary> => {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          subtotal,
          created_at,
          order_items(quantity, unit_price, variant_id, product_id)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['paid', 'shipped', 'delivered']);
      if (ordersError) throw ordersError;

      const { data: previousOrders, error: prevOrdersError } = await supabase
        .from('orders')
        .select('id, total, subtotal, created_at')
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString())
        .in('status', ['paid', 'shipped', 'delivered']);
      if (prevOrdersError) throw prevOrdersError;

      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('id, cost, product_id');
      if (variantsError) throw variantsError;

      const variantCostMap = new Map(variants?.map((v) => [v.id, v.cost || 0]) || []);
      const productCostAgg = new Map<string, { total: number; count: number }>();
      variants?.forEach((v) => {
        const existing = productCostAgg.get(v.product_id);
        if (!existing) {
          productCostAgg.set(v.product_id, { total: v.cost || 0, count: 1 });
        } else {
          existing.total += v.cost || 0;
          existing.count += 1;
        }
      });
      const productAvgCost = new Map<string, number>();
      productCostAgg.forEach((val, key) => {
        productAvgCost.set(key, val.count > 0 ? val.total / val.count : 0);
      });

      let revenue = 0;
      let productCosts = 0;
      orders?.forEach((order) => {
        revenue += order.subtotal || 0;
        order.order_items?.forEach((item: any) => {
          const cost = item.variant_id
            ? variantCostMap.get(item.variant_id) || 0
            : productAvgCost.get(item.product_id) || 0;
          productCosts += cost * item.quantity;
        });
      });

      const prevRevenue = previousOrders?.reduce((sum, o) => sum + (o.subtotal || 0), 0) || 0;
      const prevOrdersCount = previousOrders?.length || 0;
      const prevAverageOrderValue = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, paid_at')
        .not('paid_at', 'is', null)
        .gte('paid_at', startDate.toISOString())
        .lte('paid_at', endDate.toISOString());
      if (expensesError) throw expensesError;
      const totalExpensesPaid = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const { data: pendingExpensesData, error: pendingError } = await supabase
        .from('expenses')
        .select('amount')
        .is('paid_at', null)
        .gte('due_date', startDate.toISOString().slice(0, 10))
        .lte('due_date', endDate.toISOString().slice(0, 10));
      if (pendingError) throw pendingError;

      const totalPendingExpenses = pendingExpensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalAllExpenses = totalExpensesPaid + totalPendingExpenses;

      const grossProfit = revenue - productCosts;
      const netProfit = grossProfit - totalAllExpenses;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const ordersCount = orders?.length || 0;
      const averageOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;

      return {
        revenue,
        productCosts,
        grossProfit,
        expenses: totalExpensesPaid,
        pendingExpenses: totalPendingExpenses,
        totalExpenses: totalAllExpenses,
        netProfit,
        grossMargin,
        netMargin,
        ordersCount,
        averageOrderValue,
        previousRevenue: prevRevenue,
        previousOrders: prevOrdersCount,
        previousAverage: prevAverageOrderValue,
        revenueGrowth: calculateGrowth(revenue, prevRevenue),
        ordersGrowth: calculateGrowth(ordersCount, prevOrdersCount),
        averageGrowth: calculateGrowth(averageOrderValue, prevAverageOrderValue),
      };
    },
  });

  // Monthly data (rolling 6 months)
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['finance-monthly'],
    queryFn: async (): Promise<MonthlyData[]> => {
      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM');

        const { data: orders } = await supabase
          .from('orders')
          .select('subtotal')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
          .in('status', ['paid', 'shipped', 'delivered']);
        const revenue = orders?.reduce((sum, o) => sum + (o.subtotal || 0), 0) || 0;

        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .gte('due_date', monthStart.toISOString().slice(0, 10))
          .lte('due_date', monthEnd.toISOString().slice(0, 10));
        const expensesTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        months.push({
          month: monthLabel,
          revenue,
          expenses: expensesTotal,
          profit: revenue - expensesTotal,
        });
      }
      return months;
    },
  });

  // Product profitability
  const { data: productProfitability, isLoading: profitabilityLoading } = useQuery({
    queryKey: ['product-profitability', periodKey],
    queryFn: async (): Promise<ProductProfitability[]> => {
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          total_price,
          product_title,
          product_id,
          variant_id,
          order:orders!inner(status, created_at)
        `)
        .gte('order.created_at', startDate.toISOString())
        .lte('order.created_at', endDate.toISOString());
      if (error) throw error;

      const validItems = orderItems?.filter((item: any) =>
        ['paid', 'shipped', 'delivered'].includes(item.order?.status)
      ) || [];

      const { data: variants } = await supabase.from('product_variants').select('id, cost');
      const variantCostMap = new Map(variants?.map((v) => [v.id, v.cost || 0]) || []);

      const productMap = new Map<string, ProductProfitability>();
      validItems.forEach((item: any) => {
        const key = item.product_id || item.product_title;
        const existing = productMap.get(key);
        const cost = variantCostMap.get(item.variant_id) || 0;
        const itemCost = cost * item.quantity;
        const itemRevenue = item.total_price || 0;

        if (existing) {
          existing.revenue += itemRevenue;
          existing.cost += itemCost;
          existing.quantity += item.quantity;
          existing.profit = existing.revenue - existing.cost;
          existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
        } else {
          productMap.set(key, {
            id: item.product_id || key,
            title: item.product_title,
            revenue: itemRevenue,
            cost: itemCost,
            profit: itemRevenue - itemCost,
            margin: itemRevenue > 0 ? ((itemRevenue - itemCost) / itemRevenue) * 100 : 0,
            quantity: item.quantity,
          });
        }
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
    },
  });

  // Cash flow projection (30 days)
  const { data: cashFlow, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['cash-flow-projection'],
    queryFn: async (): Promise<CashFlowProjection> => {
      const in30Days = addDays(today, 30);
      const { data: pendingOrders, error: ordersError } = await supabase
        .from('orders')
        .select('total')
        .in('status', ['pending', 'processing', 'paid']);
      if (ordersError) throw ordersError;
      const expectedRevenue = pendingOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      const { data: upcomingExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, due_date')
        .is('paid_at', null)
        .gte('due_date', today.toISOString().slice(0, 10))
        .lte('due_date', in30Days.toISOString().slice(0, 10));
      if (expensesError) throw expensesError;
      const expectedExpenses = upcomingExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      return {
        expectedRevenue,
        expectedExpenses,
        projectedBalance: expectedRevenue - expectedExpenses,
        pendingOrdersCount: pendingOrders?.length || 0,
        upcomingExpensesCount: upcomingExpenses?.length || 0,
      };
    },
  });

  // Payment methods
  const { data: paymentMethods, isLoading: pmLoading } = useQuery({
    queryKey: ['finance-payment-methods', periodKey],
    queryFn: async (): Promise<PaymentMethodBreakdown[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_method, total')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['paid', 'shipped', 'delivered']);
      if (error) throw error;

      const map = new Map<string, { amount: number; count: number }>();
      let totalAmount = 0;
      data?.forEach((o: any) => {
        const key = (o.payment_method || 'outros').toLowerCase();
        const existing = map.get(key) || { amount: 0, count: 0 };
        existing.amount += Number(o.total) || 0;
        existing.count += 1;
        map.set(key, existing);
        totalAmount += Number(o.total) || 0;
      });

      const labels: Record<string, string> = {
        pix: 'PIX',
        cartao: 'Cartão',
        cartao_credito: 'Cartão de Crédito',
        cartao_debito: 'Cartão de Débito',
        credit_card: 'Cartão de Crédito',
        debit_card: 'Cartão de Débito',
        dinheiro: 'Dinheiro',
        cash: 'Dinheiro',
        boleto: 'Boleto',
        mercadopago: 'Mercado Pago',
        outros: 'Outros',
      };
      return Array.from(map.entries())
        .map(([method, { amount, count }]) => ({
          method,
          label: labels[method] || method,
          amount,
          count,
          percent: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
    },
  });

  // Expenses by category
  const { data: expensesByCategory, isLoading: ebcLoading } = useQuery({
    queryKey: ['finance-expenses-by-category', periodKey],
    queryFn: async (): Promise<ExpenseByCategory[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, category_id, expense_categories(name, color)')
        .gte('due_date', startDate.toISOString().slice(0, 10))
        .lte('due_date', endDate.toISOString().slice(0, 10));
      if (error) throw error;

      const map = new Map<string, { name: string; color: string; amount: number; count: number }>();
      let total = 0;
      data?.forEach((e: any) => {
        const id = e.category_id || 'sem';
        const name = e.expense_categories?.name || 'Sem categoria';
        const color = e.expense_categories?.color || '#6B7280';
        const existing = map.get(id) || { name, color, amount: 0, count: 0 };
        existing.amount += Number(e.amount) || 0;
        existing.count += 1;
        map.set(id, existing);
        total += Number(e.amount) || 0;
      });

      return Array.from(map.entries())
        .map(([categoryId, v]) => ({
          categoryId: categoryId === 'sem' ? null : categoryId,
          name: v.name,
          color: v.color,
          amount: v.amount,
          count: v.count,
          percent: total > 0 ? (v.amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
    },
  });

  // Revenue by source
  const { data: revenueBySource, isLoading: rbsLoading } = useQuery({
    queryKey: ['finance-revenue-by-source', periodKey],
    queryFn: async (): Promise<RevenueBySource[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('source, total')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['paid', 'shipped', 'delivered']);
      if (error) throw error;

      const labels: Record<string, string> = {
        website: 'Site',
        manual: 'Pedido Manual',
        pos: 'PDV',
        whatsapp: 'WhatsApp',
        instagram: 'Instagram',
      };
      const map = new Map<string, { amount: number; count: number }>();
      data?.forEach((o: any) => {
        const key = o.source || 'website';
        const existing = map.get(key) || { amount: 0, count: 0 };
        existing.amount += Number(o.total) || 0;
        existing.count += 1;
        map.set(key, existing);
      });
      return Array.from(map.entries())
        .map(([source, v]) => ({
          source,
          label: labels[source] || source,
          amount: v.amount,
          count: v.count,
        }))
        .sort((a, b) => b.amount - a.amount);
    },
  });

  return {
    summary: summary || {
      revenue: 0,
      productCosts: 0,
      grossProfit: 0,
      expenses: 0,
      pendingExpenses: 0,
      totalExpenses: 0,
      netProfit: 0,
      grossMargin: 0,
      netMargin: 0,
      ordersCount: 0,
      averageOrderValue: 0,
      previousRevenue: 0,
      previousOrders: 0,
      previousAverage: 0,
      revenueGrowth: 0,
      ordersGrowth: 0,
      averageGrowth: 0,
    },
    monthlyData: monthlyData || [],
    productProfitability: productProfitability || [],
    cashFlow: cashFlow || {
      expectedRevenue: 0,
      expectedExpenses: 0,
      projectedBalance: 0,
      pendingOrdersCount: 0,
      upcomingExpensesCount: 0,
    },
    paymentMethods: paymentMethods || [],
    expensesByCategory: expensesByCategory || [],
    revenueBySource: revenueBySource || [],
    isLoading:
      summaryLoading || monthlyLoading || profitabilityLoading || cashFlowLoading || pmLoading || ebcLoading || rbsLoading,
    period,
    startDate,
    endDate,
  };
}

 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { 
   format, 
   startOfDay, 
   endOfDay, 
   differenceInDays, 
   subDays,
   parseISO,
   getHours
 } from 'date-fns';
 
 export interface SalesReportFilters {
   startDate: Date;
   endDate: Date;
   category?: string;
   productId?: string;
   status?: string[];
 }
 
 export interface SalesReportData {
   summary: {
     revenue: number;
     ordersCount: number;
     averageTicket: number;
     unitsSold: number;
     previousRevenue: number;
     previousOrders: number;
     previousUnits: number;
   };
   dailySales: Array<{
     date: string;
     revenue: number;
     orders: number;
   }>;
   categoryBreakdown: Array<{
     category: string;
     revenue: number;
     quantity: number;
   }>;
   topProducts: Array<{
     id: string;
     title: string;
     revenue: number;
     quantity: number;
   }>;
   hourlyDistribution: Array<{
     hour: number;
     revenue: number;
     orders: number;
   }>;
   orders: Array<{
     id: string;
     order_number: string;
     total: number;
     created_at: string;
     status: string;
     customer_name: string;
     items: Array<{
       product_title: string;
       quantity: number;
       total_price: number;
     }>;
   }>;
   categories: string[];
 }
 
 const DEFAULT_STATUS = ['paid', 'shipped', 'delivered'];
 
 export function useSalesReport(filters: SalesReportFilters) {
   return useQuery({
     queryKey: ['sales-report', filters.startDate?.toISOString(), filters.endDate?.toISOString(), filters.category, filters.productId, filters.status],
     queryFn: async (): Promise<SalesReportData> => {
       const statusFilter = filters.status?.length ? filters.status : DEFAULT_STATUS;
       
       // Calculate previous period for comparison
       const periodDays = differenceInDays(filters.endDate, filters.startDate);
       const previousStart = subDays(filters.startDate, periodDays + 1);
       const previousEnd = subDays(filters.startDate, 1);
       
       // Fetch current period orders
       const { data: currentOrders, error: currentError } = await supabase
         .from('orders')
         .select(`
           id, order_number, total, subtotal, created_at, status, user_id,
           order_items (
             id, quantity, total_price, product_id, product_title
           ),
           profiles:user_id (full_name)
         `)
         .gte('created_at', startOfDay(filters.startDate).toISOString())
         .lte('created_at', endOfDay(filters.endDate).toISOString())
         .in('status', statusFilter)
         .order('created_at', { ascending: false });
       
       if (currentError) throw currentError;
       
       // Fetch previous period orders for comparison
       const { data: previousOrders, error: prevError } = await supabase
         .from('orders')
         .select('id, total, order_items(quantity)')
         .gte('created_at', startOfDay(previousStart).toISOString())
         .lte('created_at', endOfDay(previousEnd).toISOString())
         .in('status', statusFilter);
       
       if (prevError) throw prevError;
       
       // Fetch all products for category mapping
       const { data: products, error: productsError } = await supabase
         .from('products')
         .select('id, product_type');
       
       if (productsError) throw productsError;
       
       const productCategoryMap = new Map<string, string>();
       const categoriesSet = new Set<string>();
       
       products?.forEach(p => {
         const category = p.product_type || 'Sem Categoria';
         productCategoryMap.set(p.id, category);
         categoriesSet.add(category);
       });
       
       // Filter by category if specified
       let filteredOrders = currentOrders || [];
       if (filters.category) {
         filteredOrders = filteredOrders.filter(order => {
           const items = order.order_items as any[];
           return items?.some(item => 
             productCategoryMap.get(item.product_id) === filters.category
           );
         });
       }
       
       // Filter by product if specified
       if (filters.productId) {
         filteredOrders = filteredOrders.filter(order => {
           const items = order.order_items as any[];
           return items?.some(item => item.product_id === filters.productId);
         });
       }
       
       // Calculate summary metrics
       const revenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
       const ordersCount = filteredOrders.length;
       const averageTicket = ordersCount > 0 ? revenue / ordersCount : 0;
       const unitsSold = filteredOrders.reduce((sum, o) => {
         const items = o.order_items as any[];
         return sum + (items?.reduce((s, i) => s + i.quantity, 0) || 0);
       }, 0);
       
       // Previous period metrics
       const previousRevenue = (previousOrders || []).reduce((sum, o) => sum + Number(o.total), 0);
       const previousOrdersCount = (previousOrders || []).length;
       const previousUnits = (previousOrders || []).reduce((sum, o) => {
         const items = o.order_items as any[];
         return sum + (items?.reduce((s, i) => s + i.quantity, 0) || 0);
       }, 0);
       
       // Daily sales aggregation
       const dailyMap = new Map<string, { revenue: number; orders: number }>();
       filteredOrders.forEach(order => {
         const date = format(parseISO(order.created_at), 'yyyy-MM-dd');
         const existing = dailyMap.get(date) || { revenue: 0, orders: 0 };
         dailyMap.set(date, {
           revenue: existing.revenue + Number(order.total),
           orders: existing.orders + 1
         });
       });
       
       const dailySales = Array.from(dailyMap.entries())
         .map(([date, data]) => ({ date, ...data }))
         .sort((a, b) => a.date.localeCompare(b.date));
       
       // Category breakdown
       const categoryMap = new Map<string, { revenue: number; quantity: number }>();
       filteredOrders.forEach(order => {
         const items = order.order_items as any[];
         items?.forEach(item => {
           const category = productCategoryMap.get(item.product_id) || 'Sem Categoria';
           const existing = categoryMap.get(category) || { revenue: 0, quantity: 0 };
           categoryMap.set(category, {
             revenue: existing.revenue + Number(item.total_price),
             quantity: existing.quantity + item.quantity
           });
         });
       });
       
       const categoryBreakdown = Array.from(categoryMap.entries())
         .map(([category, data]) => ({ category, ...data }))
         .sort((a, b) => b.revenue - a.revenue);
       
       // Top products
       const productMap = new Map<string, { id: string; title: string; revenue: number; quantity: number }>();
       filteredOrders.forEach(order => {
         const items = order.order_items as any[];
         items?.forEach(item => {
           const existing = productMap.get(item.product_id) || { 
             id: item.product_id, 
             title: item.product_title, 
             revenue: 0, 
             quantity: 0 
           };
           productMap.set(item.product_id, {
             ...existing,
             revenue: existing.revenue + Number(item.total_price),
             quantity: existing.quantity + item.quantity
           });
         });
       });
       
       const topProducts = Array.from(productMap.values())
         .sort((a, b) => b.revenue - a.revenue)
         .slice(0, 10);
       
       // Hourly distribution
       const hourlyMap = new Map<number, { revenue: number; orders: number }>();
       for (let i = 0; i < 24; i++) {
         hourlyMap.set(i, { revenue: 0, orders: 0 });
       }
       
       filteredOrders.forEach(order => {
         const hour = getHours(parseISO(order.created_at));
         const existing = hourlyMap.get(hour)!;
         hourlyMap.set(hour, {
           revenue: existing.revenue + Number(order.total),
           orders: existing.orders + 1
         });
       });
       
       const hourlyDistribution = Array.from(hourlyMap.entries())
         .map(([hour, data]) => ({ hour, ...data }));
       
       // Format orders for table
       const orders = filteredOrders.map(order => ({
         id: order.id,
         order_number: order.order_number,
         total: Number(order.total),
         created_at: order.created_at,
         status: order.status,
         customer_name: (order.profiles as any)?.full_name || 'Cliente',
         items: (order.order_items as any[])?.map(item => ({
           product_title: item.product_title,
           quantity: item.quantity,
           total_price: Number(item.total_price)
         })) || []
       }));
       
       return {
         summary: {
           revenue,
           ordersCount,
           averageTicket,
           unitsSold,
           previousRevenue,
           previousOrders: previousOrdersCount,
           previousUnits
         },
         dailySales,
         categoryBreakdown,
         topProducts,
         hourlyDistribution,
         orders,
         categories: Array.from(categoriesSet).sort()
       };
     },
     enabled: !!filters.startDate && !!filters.endDate
   });
 }
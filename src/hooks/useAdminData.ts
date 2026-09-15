import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useRealtimeRefetch } from './useRealtimeInvalidator';

export interface AdminOrder {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address: any;
  created_at: string;
  updated_at: string;
  order_items?: any[];
  profile?: {
    full_name: string | null;
    phone: string | null;
    cpf?: string | null;
  };
  source?: string;
  created_by?: string | null;
  created_by_name?: string | null;
  store_id?: string | null;
  store_name?: string | null;
  bling_channel?: string | null;
  bling_order_number?: string | null;
  bling_raw_payload?: any;
}

export interface AdminCustomer {
  id: string;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  created_at: string;
  email?: string;
  orders_count?: number;
  total_spent?: number;
  role?: 'admin' | 'vendedor' | 'consignador' | 'user';
}

export function useAdminData() {
  const { isVendedor, loading: roleLoading } = useUserRole();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    totalInventory: 0,
    totalProducts: 0,
  });

  const fetchOrders = useCallback(async () => {
    if (!isVendedor) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        profiles:user_id (full_name, phone, cpf)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    const orderIds = (data ?? []).map(order => order.id);
    const storeIds = [...new Set(data?.map(order => order.store_id).filter(Boolean) as string[])];
    const [{ data: links }, { data: stores }] = await Promise.all([
      orderIds.length
        ? supabase.from('bling_order_links').select('order_id, channel, bling_order_number, raw_payload').in('order_id', orderIds)
        : Promise.resolve({ data: [] }),
      storeIds.length
        ? supabase.from('stores').select('id, name').in('id', storeIds)
        : Promise.resolve({ data: [] }),
    ]);
    const linkMap = new Map((links ?? []).map(link => [link.order_id, link]));
    const storeMap = new Map((stores ?? []).map(store => [store.id, store.name]));

    // Fetch creator names for manual orders
    const creatorIds = [...new Set(data?.map(o => o.created_by).filter(Boolean) as string[])];
    let creatorMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);
      if (creators) {
        creatorMap = creators.reduce((acc: Record<string, string>, c) => {
          acc[c.id] = c.full_name || 'Admin';
          return acc;
        }, {});
      }
    }

    const formattedOrders = data?.map(order => {
      const link = linkMap.get(order.id);
      return {
        ...order,
        profile: order.profiles as any,
        source: order.source || 'website',
        created_by_name: order.created_by ? creatorMap[order.created_by] || 'Admin' : null,
        store_name: order.store_id ? storeMap.get(order.store_id) ?? null : null,
        bling_channel: link?.channel ?? null,
        bling_order_number: link?.bling_order_number ?? null,
        bling_raw_payload: link?.raw_payload ?? null,
      };
    }) || [];

    setOrders(formattedOrders);
  }, [isVendedor]);

  const fetchCustomers = useCallback(async () => {
    if (!isVendedor) return;

    const { data, error } = await supabase.functions.invoke('list-all-users');
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    setCustomers((data?.users || []) as AdminCustomer[]);
  }, [isVendedor]);

  const fetchInventoryStats = useCallback(async () => {
    if (!isVendedor) return;
    const { data, error } = await supabase
      .from('product_variants')
      .select('inventory_quantity, product_id');
    if (error) {
      console.error('Error fetching inventory:', error);
      return;
    }
    const totalInventory = (data || []).reduce((sum, v) => sum + Number(v.inventory_quantity || 0), 0);
    const totalProducts = new Set((data || []).map(v => v.product_id)).size;
    setStats(prev => ({ ...prev, totalInventory, totalProducts }));
  }, [isVendedor]);

  const calculateStats = useCallback(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalCustomers = customers.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    setStats(prev => ({
      ...prev,
      totalOrders,
      totalRevenue,
      totalCustomers,
      pendingOrders,
    }));
  }, [orders, customers]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const updates: Record<string, string> = { status, updated_at: new Date().toISOString() };
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();
    if (status === 'shipped') updates.shipped_at = new Date().toISOString();

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error);
      throw error;
    }

    // Record status change in history
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status,
        changed_by: user?.id || null,
        note: `Status alterado para ${status}`,
      });
    } catch (historyErr) {
      console.error('Failed to record status history:', historyErr);
    }

    // Trigger notifications for relevant status changes
    const notifiableStatuses = ['paid', 'shipped', 'delivered', 'cancelled'];
    if (notifiableStatuses.includes(status)) {
      try {
        const notificationTypeMap: Record<string, string> = {
          paid: 'order_confirmed',
          shipped: 'order_shipped',
          delivered: 'order_delivered',
          cancelled: 'order_cancelled',
        };
        await supabase.functions.invoke('send-notification', {
          body: { type: notificationTypeMap[status], orderId },
        });
      } catch (notifyErr) {
        console.error('Failed to trigger notification:', notifyErr);
      }
    }

    await fetchOrders();
  };

  useEffect(() => {
    if (roleLoading) return;
    if (isVendedor) {
      Promise.all([fetchOrders(), fetchCustomers(), fetchInventoryStats()]).finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [roleLoading, isVendedor, fetchOrders, fetchCustomers]);

  useEffect(() => {
    calculateStats();
  }, [orders, customers, calculateStats]);

  // Atualiza automaticamente quando vendas/itens/estoque mudam em qualquer canal
  useRealtimeRefetch(
    ['orders', 'order_items', 'product_variants', 'fiscal_documents'],
    () => {
      if (!isVendedor) return;
      fetchOrders();
      fetchInventoryStats();
    },
    isVendedor && !roleLoading,
  );

  return {
    orders,
    customers,
    stats,
    loading,
    updateOrderStatus,
    refetch: () => Promise.all([fetchOrders(), fetchCustomers(), fetchInventoryStats()]),
  };
}

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
  };
  source?: string;
  created_by?: string | null;
  created_by_name?: string | null;
  store_id?: string | null;
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
        profiles:user_id (full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

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

    const formattedOrders = data?.map(order => ({
      ...order,
      profile: order.profiles as any,
      source: order.source || 'website',
      created_by_name: order.created_by ? creatorMap[order.created_by] || 'Admin' : null,
    })) || [];

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
    ['orders', 'order_items', 'product_variants'],
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

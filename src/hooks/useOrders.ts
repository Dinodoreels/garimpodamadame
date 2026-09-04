import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  shopify_product_id: string; // Legacy field - kept for DB compatibility
  shopify_variant_id: string; // Legacy field - kept for DB compatibility
  product_title: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  shopify_checkout_id: string | null; // Legacy field - kept for DB compatibility
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address: any;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getOrderByNumber = async (orderNumber: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('user_id', user.id)
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching order:', error);
      return null;
    }

    return data;
  };

  return {
    orders,
    loading,
    getOrderByNumber,
    refetch: fetchOrders
  };
}

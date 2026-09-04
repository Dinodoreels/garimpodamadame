import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CustomerCoupon {
  id: string;
  user_id: string;
  discount_id: string;
  assigned_at: string;
  is_used: boolean;
  used_at: string | null;
  expires_at: string | null;
  note: string | null;
  // Joined from discount_codes
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_value: number | null;
  max_discount: number | null;
  is_active: boolean;
}

export function useCustomerCoupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = useCallback(async () => {
    if (!user) {
      setCoupons([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch customer_coupons with discount_codes join
      const { data: customerCoupons, error: ccError } = await supabase
        .from('customer_coupons' as any)
        .select('*')
        .eq('user_id', user.id);

      if (ccError) {
        console.error('Error fetching customer coupons:', ccError);
        setCoupons([]);
        setLoading(false);
        return;
      }

      if (!customerCoupons || customerCoupons.length === 0) {
        setCoupons([]);
        setLoading(false);
        return;
      }

      // Fetch related discount_codes
      const discountIds = (customerCoupons as any[]).map((cc: any) => cc.discount_id);
      const { data: discounts, error: dError } = await supabase
        .from('discount_codes')
        .select('*')
        .in('id', discountIds);

      if (dError) {
        console.error('Error fetching discounts:', dError);
        setCoupons([]);
        setLoading(false);
        return;
      }

      const discountMap = new Map((discounts || []).map((d: any) => [d.id, d]));

      const merged: CustomerCoupon[] = (customerCoupons as any[])
        .map((cc: any) => {
          const discount = discountMap.get(cc.discount_id);
          if (!discount) return null;
          return {
            id: cc.id,
            user_id: cc.user_id,
            discount_id: cc.discount_id,
            assigned_at: cc.assigned_at,
            is_used: cc.is_used,
            used_at: cc.used_at,
            expires_at: cc.expires_at,
            note: cc.note,
            code: discount.code,
            type: discount.type as 'percentage' | 'fixed',
            value: discount.value,
            min_order_value: discount.min_order_value,
            max_discount: discount.max_discount,
            is_active: discount.is_active,
          };
        })
        .filter(Boolean) as CustomerCoupon[];

      setCoupons(merged);
    } catch (err) {
      console.error('Error in useCustomerCoupons:', err);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const availableCoupons = coupons.filter((c) => {
    if (c.is_used) return false;
    if (!c.is_active) return false;
    if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
    return true;
  });

  return { coupons, availableCoupons, loading, refetch: fetchCoupons };
}

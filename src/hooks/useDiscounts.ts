import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from './useAdmin';

export interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_value: number | null;
  max_discount: number | null;
  max_uses: number | null;
  uses_per_user: number;
  uses_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ValidateDiscountResult {
  valid: boolean;
  discount: DiscountCode | null;
  discountAmount: number;
  errorMessage: string | null;
}

export function useDiscounts() {
  const { isAdmin } = useAdmin();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDiscounts = useCallback(async () => {
    if (!isAdmin) return;

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discounts:', error);
      return;
    }

    setDiscounts(data as DiscountCode[] || []);
  }, [isAdmin]);

  const createDiscount = async (discount: Omit<DiscountCode, 'id' | 'uses_count' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('discount_codes')
      .insert({
        ...discount,
        code: discount.code.toUpperCase(),
      })
      .select()
      .single();

    if (error) throw error;
    await fetchDiscounts();
    return data;
  };

  const updateDiscount = async (id: string, updates: Partial<DiscountCode>) => {
    const { error } = await supabase
      .from('discount_codes')
      .update({
        ...updates,
        code: updates.code?.toUpperCase(),
      })
      .eq('id', id);

    if (error) throw error;
    await fetchDiscounts();
  };

  const deleteDiscount = async (id: string) => {
    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchDiscounts();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('discount_codes')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
    await fetchDiscounts();
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDiscounts().finally(() => setLoading(false));
    }
  }, [isAdmin, fetchDiscounts]);

  return {
    discounts,
    loading,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    toggleActive,
    refetch: fetchDiscounts,
  };
}

export function useValidateDiscount() {
  const [validating, setValidating] = useState(false);

  const validateDiscount = async (
    code: string,
    subtotal: number,
    userId: string
  ): Promise<ValidateDiscountResult> => {
    setValidating(true);

    try {
      // Use server-side RPC so unauthenticated visitors cannot enumerate discount codes
      const { data: rows, error } = await supabase.rpc('validate_discount_code', {
        p_code: code.toUpperCase(),
      });
      const discount = Array.isArray(rows) ? rows[0] : rows;

      if (error || !discount) {
        return {
          valid: false,
          discount: null,
          discountAmount: 0,
          errorMessage: 'Cupom inválido ou expirado',
        };
      }

      const now = new Date();

      // Check if discount has started
      if (discount.starts_at && new Date(discount.starts_at) > now) {
        return {
          valid: false,
          discount: null,
          discountAmount: 0,
          errorMessage: 'Cupom ainda não está ativo',
        };
      }

      // Check if discount has expired
      if (discount.expires_at && new Date(discount.expires_at) < now) {
        return {
          valid: false,
          discount: null,
          discountAmount: 0,
          errorMessage: 'Cupom expirado',
        };
      }

      // Check minimum order value
      if (discount.min_order_value && subtotal < discount.min_order_value) {
        return {
          valid: false,
          discount: null,
          discountAmount: 0,
          errorMessage: `Valor mínimo de R$ ${discount.min_order_value.toFixed(2)} para usar este cupom`,
        };
      }

      // Check max uses
      if (discount.max_uses && discount.uses_count >= discount.max_uses) {
        return {
          valid: false,
          discount: null,
          discountAmount: 0,
          errorMessage: 'Cupom esgotado',
        };
      }

      // Check user usage limit
      const { count } = await supabase
        .from('discount_usage')
        .select('*', { count: 'exact', head: true })
        .eq('discount_id', discount.id)
        .eq('user_id', userId);

      if (discount.uses_per_user && (count || 0) >= discount.uses_per_user) {
        return {
          valid: false,
          discount: null,
          discountAmount: 0,
          errorMessage: 'Você já usou este cupom',
        };
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discount.type === 'percentage') {
        discountAmount = subtotal * (discount.value / 100);
        if (discount.max_discount) {
          discountAmount = Math.min(discountAmount, discount.max_discount);
        }
      } else {
        discountAmount = Math.min(discount.value, subtotal);
      }

      return {
        valid: true,
        discount: discount as DiscountCode,
        discountAmount,
        errorMessage: null,
      };
    } catch (err) {
      console.error('Error validating discount:', err);
      return {
        valid: false,
        discount: null,
        discountAmount: 0,
        errorMessage: 'Erro ao validar cupom',
      };
    } finally {
      setValidating(false);
    }
  };

  return { validateDiscount, validating };
}

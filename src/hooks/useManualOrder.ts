import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductVariant } from '@/hooks/useProducts';
import { Address } from '@/hooks/useAddresses';

export interface GuestInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface ManualOrderItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface ManualOrderData {
  customerType: 'registered' | 'guest';
  customerId?: string;
  guestInfo?: GuestInfo;
  items: ManualOrderItem[];
  shippingAddress: {
    recipient_name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  shippingCost: number;
  discountCode?: string;
  discountAmount?: number;
  source?: 'website' | 'whatsapp' | 'store';
  storeId?: string;
  paymentMethod: string;
  initialStatus: string;
  adminNotes?: string;
  saleDate?: string;
}

export interface CustomerSearchResult {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string;
}

export interface DiscountValidation {
  valid: boolean;
  type?: string;
  value?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  message?: string;
  calculatedDiscount?: number;
}

export function useManualOrder() {
  const [loading, setLoading] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const searchCustomers = useCallback(async (query: string): Promise<CustomerSearchResult[]> => {
    if (query.length < 2) return [];
    
    setSearchingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error('Error searching customers:', error);
        return [];
      }

      return data || [];
    } finally {
      setSearchingCustomers(false);
    }
  }, []);

  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    if (query.length < 2) return [];
    
    setSearchingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(*),
          variants:product_variants(*),
          options:product_options(*)
        `)
        .or(`title.ilike.%${query}%,handle.ilike.%${query}%`)
        .eq('is_available', true)
        .limit(20);

      if (error) {
        console.error('Error searching products:', error);
        return [];
      }

      return data || [];
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  const fetchCustomerAddresses = useCallback(async (customerId: string): Promise<Address[]> => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', customerId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer addresses:', error);
        return [];
      }

      return (data || []) as Address[];
    } catch {
      return [];
    }
  }, []);

  const validateDiscount = useCallback(async (code: string, subtotal: number): Promise<DiscountValidation> => {
    if (!code.trim()) return { valid: false, message: '' };

    try {
      const { data: rows, error } = await supabase.rpc('validate_discount_code', {
        p_code: code.toUpperCase(),
      });
      const data = Array.isArray(rows) ? rows[0] : rows;

      if (error || !data) {
        return { valid: false, message: 'Cupom não encontrado' };
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, message: 'Cupom expirado' };
      }

      // Check start date
      if (data.starts_at && new Date(data.starts_at) > new Date()) {
        return { valid: false, message: 'Cupom ainda não está ativo' };
      }

      // Check max uses
      if (data.max_uses && (data.uses_count || 0) >= data.max_uses) {
        return { valid: false, message: 'Cupom esgotado' };
      }

      // Check min order value
      if (data.min_order_value && subtotal < data.min_order_value) {
        return {
          valid: false,
          message: `Pedido mínimo de R$ ${data.min_order_value.toFixed(2)}`,
        };
      }

      // Calculate discount
      let calculatedDiscount = 0;
      if (data.type === 'percentage') {
        calculatedDiscount = subtotal * (data.value / 100);
        if (data.max_discount && calculatedDiscount > data.max_discount) {
          calculatedDiscount = data.max_discount;
        }
      } else {
        calculatedDiscount = data.value;
      }

      calculatedDiscount = Math.min(calculatedDiscount, subtotal);

      return {
        valid: true,
        type: data.type,
        value: data.value,
        maxDiscount: data.max_discount || undefined,
        minOrderValue: data.min_order_value || undefined,
        calculatedDiscount,
        message: data.type === 'percentage'
          ? `${data.value}% de desconto`
          : `R$ ${data.value.toFixed(2)} de desconto`,
      };
    } catch {
      return { valid: false, message: 'Erro ao validar cupom' };
    }
  }, []);

  const createOrder = useCallback(async (orderData: ManualOrderData): Promise<{ success: boolean; orderNumber?: string; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-manual-order', {
        body: orderData,
      });

      if (error) {
        console.error('Error creating manual order:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      return { success: true, orderNumber: data.order_number };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: 'Erro ao criar pedido' };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    searchingCustomers,
    searchingProducts,
    searchCustomers,
    searchProducts,
    createOrder,
    fetchCustomerAddresses,
    validateDiscount,
  };
}

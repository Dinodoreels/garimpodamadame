import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  created_at: string;
}

interface CustomerAddress {
  id: string;
  label: string;
  recipient_name: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
}

interface CustomerStats {
  orders_count: number;
  total_spent: number;
  last_order: {
    id: string;
    total: number;
    created_at: string;
    status: string;
  } | null;
}

export type UserRole = 'admin' | 'vendedor' | 'user';

export interface SellerStats {
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  month_orders: number;
  month_revenue: number;
  last_sale: {
    id: string;
    total: number;
    created_at: string;
  } | null;
}

export interface CustomerDetails {
  profile: CustomerProfile;
  email: string | null;
  addresses: CustomerAddress[];
  stats: CustomerStats;
  role: UserRole;
  seller_stats: SellerStats | null;
}

export function useCustomerDetails(customerId: string | null) {
  const [data, setData] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!customerId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    async function fetchCustomerDetails() {
      setLoading(true);
      setError(null);

      try {
        const { data: responseData, error: invokeError } = await supabase.functions.invoke(
          'get-customer-details',
          {
            body: { customerId },
          }
        );

        if (invokeError) {
          console.error('Error invoking function:', invokeError);
          setError('Erro ao carregar detalhes do cliente');
          return;
        }

        if (responseData?.error) {
          console.error('Function error:', responseData.error);
          setError(responseData.error);
          return;
        }

        setData(responseData as CustomerDetails);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Erro inesperado');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerDetails();
  }, [customerId, reloadKey]);

  return { data, loading, error, refetch: () => setReloadKey((k) => k + 1) };
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreateCustomerPayload {
  profile: {
    full_name: string;
    email: string;
    phone: string;
    cpf: string;
    birth_date?: string | null;
  };
  address: {
    zip_code: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export function useCreateCustomer() {
  const [loading, setLoading] = useState(false);

  const createCustomer = async (payload: CreateCustomerPayload) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-customer', {
        body: payload,
      });

      if (error) {
        const msg = (error as any)?.context?.error || (error as any)?.message || 'Erro ao cadastrar cliente';
        toast.error(msg);
        return { success: false };
      }
      if (data?.error) {
        toast.error(data.error);
        return { success: false };
      }

      toast.success(`Cliente cadastrado. Convite enviado para ${data.email}`);
      return { success: true, userId: data.userId };
    } catch (err) {
      console.error('createCustomer error:', err);
      toast.error('Erro inesperado ao cadastrar cliente');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { createCustomer, loading };
}
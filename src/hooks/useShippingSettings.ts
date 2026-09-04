import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FreeShippingSettings {
  enabled: boolean;
  min_value: number;
  discount_code: string;
}

export interface ShippingRate {
  id: string;
  state_code: string;
  state_name: string;
  cost: number;
  estimated_days: string;
  region: string;
  dropship_extra_days: number;
  created_at: string;
  updated_at: string;
}

// Hook para buscar configuração de frete grátis
export function useFreeShippingSettings() {
  return useQuery({
    queryKey: ['free-shipping-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'free_shipping')
        .single();
      
      if (error) {
        console.error('Error fetching free shipping settings:', error);
        return null;
      }
      
      return data?.value as unknown as FreeShippingSettings | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook para buscar todas as taxas de frete
export function useShippingRates() {
  return useQuery({
    queryKey: ['shipping-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .order('region', { ascending: true })
        .order('state_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching shipping rates:', error);
        throw error;
      }
      
      return data as ShippingRate[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook para buscar taxa de um estado específico
export function useShippingRateByState(stateCode: string | null) {
  return useQuery({
    queryKey: ['shipping-rate', stateCode],
    queryFn: async () => {
      if (!stateCode) return null;
      
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .eq('state_code', stateCode)
        .single();
      
      if (error) {
        console.error('Error fetching shipping rate:', error);
        return null;
      }
      
      return data as ShippingRate;
    },
    enabled: !!stateCode,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook para atualizar taxa de um estado
export function useUpdateShippingRate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      cost, 
      estimated_days, 
      dropship_extra_days 
    }: { 
      id: string; 
      cost: number; 
      estimated_days: string;
      dropship_extra_days: number;
    }) => {
      const { error } = await supabase
        .from('shipping_rates')
        .update({ cost, estimated_days, dropship_extra_days })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-rate'] });
      toast.success('Taxa de frete atualizada');
    },
    onError: (error) => {
      console.error('Error updating shipping rate:', error);
      toast.error('Erro ao atualizar taxa de frete');
    }
  });
}

// Hook para atualizar configuração de frete grátis
export function useUpdateFreeShipping() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: FreeShippingSettings) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('site_settings')
        .update({ value: settings as any })
        .eq('key', 'free_shipping');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-shipping-settings'] });
      toast.success('Configurações de frete grátis atualizadas');
    },
    onError: (error) => {
      console.error('Error updating free shipping settings:', error);
      toast.error('Erro ao atualizar configurações');
    }
  });
}

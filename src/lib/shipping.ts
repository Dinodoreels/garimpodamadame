import { supabase } from '@/integrations/supabase/client';

// Valor padrão se estado não encontrado
export const DEFAULT_SHIPPING_COST = 50.00;

// Função para obter endereço a partir do CEP via ViaCEP
export async function getAddressFromZip(zipCode: string): Promise<{
  state: string;
  city: string;
  neighborhood: string;
  street: string;
} | null> {
  const cleanZip = zipCode.replace(/\D/g, '');
  
  if (cleanZip.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      state: data.uf,
      city: data.localidade,
      neighborhood: data.bairro,
      street: data.logradouro
    };
  } catch {
    return null;
  }
}

export interface ShippingOption {
  carrier: string;
  service: string;
  service_code: string;
  cost: number;
  estimated_days: number;
  estimated_text: string;
  is_free: boolean;
  original_cost: number;
  quote_source?: 'melhor_envio' | 'correios' | 'local';
}

export interface ShippingResult {
  cost: number;
  originalCost: number;
  state: string;
  city: string;
  estimatedDays: string;
  isFreeShipping: boolean;
  freeShippingMinValue?: number;
  amountToFreeShipping?: number;
  dropshipExtraDays?: number;
  option: ShippingOption;
}

export interface ShippingCalcResponse {
  options: ShippingOption[];
  address: {
    state: string;
    city: string;
    neighborhood: string;
    street: string;
  } | null;
  free_shipping_info: {
    enabled: boolean;
    min_value: number;
    qualifies: boolean;
    amount_remaining: number;
  } | null;
  dropship_extra_days: number;
  provider_error?: string | null;
  reconnect_required?: boolean;
}

export interface CalculateShippingOptions {
  subtotal?: number;
  hasDropshipItems?: boolean;
  items?: Array<{
    product_id: string;
    quantity: number;
  }>;
}

export function getShippingErrorMessage(result: ShippingCalcResponse | null): string {
  if (result?.provider_error) return result.provider_error;
  if (result?.address) return 'Não há opções de entrega disponíveis para este CEP.';
  return 'CEP não encontrado ou não foi possível calcular o frete.';
}

// Calcular frete via edge function (múltiplas opções)
export async function calculateShippingOptions(
  zipCode: string,
  options?: CalculateShippingOptions
): Promise<ShippingCalcResponse | null> {
  const cleanZip = zipCode.replace(/\D/g, '');
  if (cleanZip.length !== 8) return null;

  try {
    const { data, error } = await supabase.functions.invoke('calculate-shipping', {
      body: {
        zip_code_destination: cleanZip,
        items: options?.items || [],
        subtotal: options?.subtotal || 0,
        has_dropship_items: options?.hasDropshipItems || false,
      },
    });

    if (error) {
      console.error('Error calculating shipping:', error);
      return null;
    }

    return data as ShippingCalcResponse;
  } catch (e) {
    console.error('Shipping calculation failed:', e);
    return null;
  }
}

// Legacy: Calcular frete (mantém compatibilidade)
export async function calculateShipping(
  zipCode: string,
  options?: CalculateShippingOptions
): Promise<ShippingResult | null> {
  const result = await calculateShippingOptions(zipCode, options);

  if (result?.provider_error) {
    throw new Error(result.provider_error);
  }
  
  if (!result || !result.address) return null;

  // Return cheapest option for backwards compat
  const cheapest = result.options[0];
  if (!cheapest) return null;

  return {
    cost: cheapest.cost,
    originalCost: cheapest.original_cost,
    state: result.address.state,
    city: result.address.city,
    estimatedDays: cheapest.estimated_text,
    isFreeShipping: cheapest.is_free,
    freeShippingMinValue: result.free_shipping_info?.min_value,
    amountToFreeShipping: result.free_shipping_info?.amount_remaining,
    dropshipExtraDays: result.dropship_extra_days || undefined,
    option: cheapest,
  };
}

// Formatar CEP
export function formatZipCode(value: string): string {
  const cleanValue = value.replace(/\D/g, '').slice(0, 8);
  if (cleanValue.length > 5) {
    return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`;
  }
  return cleanValue;
}

// Buscar configuração de frete grátis
export async function getFreeShippingSettings(): Promise<{
  enabled: boolean;
  min_value: number;
  discount_code: string;
} | null> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'free_shipping')
    .single();
  
  return data?.value as {
    enabled: boolean;
    min_value: number;
    discount_code: string;
  } | null;
}

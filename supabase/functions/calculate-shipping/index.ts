import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/melhor-envio.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ShippingItem {
  product_id: string;
  quantity: number;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
}

interface ShippingOption {
  carrier: string;
  service: string;
  service_code: string;
  cost: number;
  estimated_days: number;
  estimated_text: string;
  is_free: boolean;
  original_cost: number;
  quote_source: 'melhor_envio' | 'correios' | 'local';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zip_code_destination, items, subtotal = 0, has_dropship_items = false } = await req.json();

    if (!zip_code_destination) {
      return new Response(JSON.stringify({ error: 'CEP de destino é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanZip = zip_code_destination.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Read integrations config for shipping provider ──
    const { data: integrationsSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'integrations')
      .maybeSingle();

    const integrationsConfig = integrationsSetting?.value as any;
    const shippingConfig = integrationsConfig?.shipping;
    const activeProvider = shippingConfig?.active_provider || '';

    // Determine origin ZIP from new config, fallback to legacy
    let originZip = '';
    if (activeProvider === 'melhor_envio') {
      originZip = shippingConfig?.melhor_envio?.origin_zip?.replace(/\D/g, '') || '';
    } else if (activeProvider === 'correios') {
      originZip = shippingConfig?.correios?.origin_zip?.replace(/\D/g, '') || '';
    }

    // Fallback to legacy shipping_origin setting
    if (!originZip) {
      const { data: originSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'shipping_origin')
        .single();
      originZip = (originSetting?.value as any)?.zip_code?.replace(/\D/g, '') || '01001000';
    }

    // Calculate total package weight and dimensions from items
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    if (items && items.length > 0) {
      const productIds = items.map((i: ShippingItem) => i.product_id).filter(Boolean);
      let productsData: any[] = [];
      if (productIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id, weight_grams, length_cm, width_cm, height_cm')
          .in('id', productIds);
        productsData = data || [];
      }

      const productMap = new Map(productsData.map((p: any) => [p.id, p]));

      for (const item of items as ShippingItem[]) {
        const product = productMap.get(item.product_id);
        const weight = item.weight_grams || product?.weight_grams || 300;
        const length = item.length_cm || product?.length_cm || 20;
        const width = item.width_cm || product?.width_cm || 15;
        const height = item.height_cm || product?.height_cm || 10;

        totalWeight += weight * (item.quantity || 1);
        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
        totalHeight += height * (item.quantity || 1);
      }
    } else {
      totalWeight = 300;
      maxLength = 20;
      maxWidth = 15;
      totalHeight = 10;
    }

    // Ensure minimum dimensions
    totalWeight = Math.max(totalWeight, 300);
    maxLength = Math.max(maxLength, 16);
    maxWidth = Math.max(maxWidth, 11);
    totalHeight = Math.max(totalHeight, 2);

    // Get free shipping settings
    const { data: freeShippingSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'free_shipping')
      .single();

    const freeShippingConfig = freeShippingSetting?.value as {
      enabled: boolean;
      min_value: number;
    } | null;

    const qualifiesForFreeShipping = !!(freeShippingConfig?.enabled && subtotal >= (freeShippingConfig.min_value || 0));

    // Get dropship extra days
    let dropshipExtraDays = 0;
    if (has_dropship_items) {
      try {
        const cepResponse = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
        const cepData = await cepResponse.json();
        if (cepData && !cepData.erro) {
          const { data: rateData } = await supabase
            .from('shipping_rates')
            .select('dropship_extra_days')
            .eq('state_code', cepData.uf)
            .single();
          dropshipExtraDays = rateData?.dropship_extra_days || 0;
        }
      } catch { /* ignore */ }
    }

    let options: ShippingOption[] = [];
    let providerError: string | null = null;
    let reconnectRequired = false;

    // ── Route to active provider ──
    if (activeProvider === 'melhor_envio') {
      try {
        const melhorEnvioToken = await getValidAccessToken();
        options = await fetchMelhorEnvioQuotes(
          melhorEnvioToken, originZip, cleanZip,
          totalWeight, maxLength, maxWidth, totalHeight,
          items,
        );
      } catch (e) {
        console.error('Melhor Envio API error:', e);
        const detail = e instanceof Error ? e.message : String(e);
        reconnectRequired = detail.includes('Conecte sua conta') || detail.includes('Reconecte a conta');
        providerError = reconnectRequired
          ? 'Conecte novamente a conta do Melhor Envio nas configurações de frete.'
          : 'A cotação do Melhor Envio está temporariamente indisponível. Tente novamente.';
      }
    } else if (activeProvider === 'correios' || !activeProvider) {
      // Use native Correios simulation
      try {
        options = await fetchCorreiosQuotes(originZip, cleanZip, totalWeight, maxLength, maxWidth, totalHeight);
      } catch (e) {
        console.error('Correios calc error, falling back:', e);
      }
    }

    // Keep checkout available with the configured local rates when the live
    // provider is disconnected or temporarily unavailable.
    if (options.length === 0) {
      options = await getFallbackRates(supabase, cleanZip);
    }

    // The configured adjustment is folded into the public shipping price.
    // Keep original_cost untouched so internal operations retain the carrier cost.
    const surchargeEnabled = shippingConfig?.surcharge_enabled === true;
    const configuredSurcharge = Number(shippingConfig?.surcharge_amount ?? 0);
    const surchargeAmount = surchargeEnabled && Number.isFinite(configuredSurcharge)
      ? Math.min(1000, Math.max(0, configuredSurcharge))
      : 0;
    if (surchargeAmount > 0) {
      options = options.map((option) => ({
        ...option,
        cost: Math.round((option.cost + surchargeAmount) * 100) / 100,
      }));
      options.sort((a, b) => a.cost - b.cost);
    }

    // Apply free shipping
    if (qualifiesForFreeShipping) {
      options = options.map(opt => ({
        ...opt,
        cost: 0,
        is_free: true,
      }));
    }

    // Apply dropship extra days
    if (has_dropship_items && dropshipExtraDays > 0) {
      options = options.map(opt => ({
        ...opt,
        estimated_days: opt.estimated_days + dropshipExtraDays,
        estimated_text: `${opt.estimated_days + dropshipExtraDays} dias úteis`,
      }));
    }

    // Get address info
    let address = null;
    try {
      const cepResponse = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
      const cepData = await cepResponse.json();
      if (cepData && !cepData.erro) {
        address = {
          state: cepData.uf,
          city: cepData.localidade,
          neighborhood: cepData.bairro,
          street: cepData.logradouro,
        };
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({
      options,
      address,
      free_shipping_info: freeShippingConfig?.enabled ? {
        enabled: true,
        min_value: freeShippingConfig.min_value,
        qualifies: qualifiesForFreeShipping,
        amount_remaining: qualifiesForFreeShipping ? 0 : Math.max(0, (freeShippingConfig.min_value || 0) - subtotal),
      } : null,
      dropship_extra_days: has_dropship_items ? dropshipExtraDays : 0,
      provider_error: providerError,
      reconnect_required: reconnectRequired,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error calculating shipping:', error);
    return new Response(JSON.stringify({ error: 'Erro ao calcular frete' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Melhor Envio API ──
async function fetchMelhorEnvioQuotes(
  token: string,
  originZip: string,
  destZip: string,
  weightGrams: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  items?: ShippingItem[],
): Promise<ShippingOption[]> {
  if (!token) throw new Error('Melhor Envio token not configured');

  const weightKg = Math.max(0.3, weightGrams / 1000);

  const body = {
    from: { postal_code: originZip },
    to: { postal_code: destZip },
    products: [{
      width: widthCm,
      height: heightCm,
      length: lengthCm,
      weight: weightKg,
      quantity: 1,
    }],
  };

  const response = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Garimpo da Madame (contato@ogarimpodigital.com.br)',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Melhor Envio API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  const options: ShippingOption[] = [];
  for (const item of data) {
    // Skip services with errors
    if (item.error) continue;
    if (!item.price || parseFloat(item.price) <= 0) continue;

    const cost = parseFloat(item.price);
    const days = parseInt(item.delivery_time) || 10;

    options.push({
      carrier: item.company?.name || 'Transportadora',
      service: item.name || 'Envio',
      service_code: String(item.id || ''),
      cost: Math.round(cost * 100) / 100,
      estimated_days: days,
      estimated_text: `${days} dias úteis`,
      is_free: false,
      original_cost: Math.round(cost * 100) / 100,
      quote_source: 'melhor_envio',
    });
  }

  options.sort((a, b) => a.cost - b.cost);
  return options;
}

// ── Native Correios simulation ──
async function fetchCorreiosQuotes(
  originZip: string,
  destZip: string,
  weightGrams: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number,
): Promise<ShippingOption[]> {
  const options: ShippingOption[] = [];

  const services = [
    { code: '04510', name: 'PAC', carrier: 'Correios' },
    { code: '04014', name: 'SEDEX', carrier: 'Correios' },
  ];

  const weightKg = Math.max(0.3, weightGrams / 1000);

  for (const service of services) {
    try {
      const cost = calculateEstimatedCost(service.code, originZip, destZip, weightKg, lengthCm, widthCm, heightCm);
      const days = estimateDeliveryDays(service.code, originZip, destZip);

      if (cost > 0) {
        options.push({
          carrier: service.carrier,
          service: service.name,
          service_code: service.code,
          cost: Math.round(cost * 100) / 100,
          estimated_days: days,
          estimated_text: `${days} dias úteis`,
          is_free: false,
          original_cost: Math.round(cost * 100) / 100,
          quote_source: 'correios',
        });
      }
    } catch (e) {
      console.error(`Error fetching ${service.name}:`, e);
    }
  }

  // Mini Envios for light packages
  if (weightGrams <= 500 && lengthCm <= 30 && widthCm <= 20 && heightCm <= 5) {
    const miniCost = calculateEstimatedCost('ME', originZip, destZip, weightKg, lengthCm, widthCm, heightCm);
    const miniDays = estimateDeliveryDays('ME', originZip, destZip);
    if (miniCost > 0) {
      options.push({
        carrier: 'Correios',
        service: 'Mini Envios',
        service_code: 'ME',
        cost: Math.round(miniCost * 100) / 100,
        estimated_days: miniDays,
        estimated_text: `${miniDays} dias úteis`,
        is_free: false,
        original_cost: Math.round(miniCost * 100) / 100,
        quote_source: 'correios',
      });
    }
  }

  options.sort((a, b) => a.cost - b.cost);
  return options;
}

function calculateEstimatedCost(
  serviceCode: string,
  originZip: string,
  destZip: string,
  weightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number,
): number {
  const cubicWeight = (lengthCm * widthCm * heightCm) / 6000;
  const billableWeight = Math.max(weightKg, cubicWeight);

  const originRegion = getRegionFromZip(originZip);
  const destRegion = getRegionFromZip(destZip);
  const distanceMultiplier = getDistanceMultiplier(originRegion, destRegion);

  let baseCost: number;
  switch (serviceCode) {
    case '04014':
      baseCost = 18.00 + (billableWeight * 6.50);
      break;
    case '04510':
      baseCost = 12.00 + (billableWeight * 4.00);
      break;
    case 'ME':
      baseCost = 8.00 + (billableWeight * 2.50);
      break;
    default:
      baseCost = 15.00 + (billableWeight * 5.00);
  }

  return baseCost * distanceMultiplier;
}

function estimateDeliveryDays(serviceCode: string, originZip: string, destZip: string): number {
  const originRegion = getRegionFromZip(originZip);
  const destRegion = getRegionFromZip(destZip);
  const isSameRegion = originRegion === destRegion;
  const isSameState = originZip.substring(0, 2) === destZip.substring(0, 2);

  switch (serviceCode) {
    case '04014':
      if (isSameState) return 1;
      if (isSameRegion) return 2;
      return 4;
    case '04510':
      if (isSameState) return 3;
      if (isSameRegion) return 5;
      return 10;
    case 'ME':
      if (isSameState) return 5;
      if (isSameRegion) return 8;
      return 15;
    default:
      return 7;
  }
}

function getRegionFromZip(zip: string): string {
  const prefix = parseInt(zip.substring(0, 2));
  if (prefix >= 1 && prefix <= 19) return 'SP';
  if (prefix >= 20 && prefix <= 28) return 'RJ';
  if (prefix >= 29 && prefix <= 29) return 'ES';
  if (prefix >= 30 && prefix <= 39) return 'MG';
  if (prefix >= 40 && prefix <= 48) return 'BA';
  if (prefix >= 49 && prefix <= 49) return 'SE';
  if (prefix >= 50 && prefix <= 56) return 'PE';
  if (prefix >= 57 && prefix <= 57) return 'AL';
  if (prefix >= 58 && prefix <= 58) return 'PB';
  if (prefix >= 59 && prefix <= 59) return 'RN';
  if (prefix >= 60 && prefix <= 63) return 'CE';
  if (prefix >= 64 && prefix <= 64) return 'PI';
  if (prefix >= 65 && prefix <= 65) return 'MA';
  if (prefix >= 66 && prefix <= 68) return 'PA';
  if (prefix >= 69 && prefix <= 69) return 'AM';
  if (prefix >= 70 && prefix <= 73) return 'DF';
  if (prefix >= 74 && prefix <= 76) return 'GO';
  if (prefix >= 77 && prefix <= 77) return 'TO';
  if (prefix >= 78 && prefix <= 78) return 'MT';
  if (prefix >= 79 && prefix <= 79) return 'MS';
  if (prefix >= 80 && prefix <= 83) return 'PR';
  if (prefix >= 84 && prefix <= 89) return 'SC';
  if (prefix >= 90 && prefix <= 99) return 'RS';
  return 'OTHER';
}

function getDistanceMultiplier(origin: string, dest: string): number {
  const regionGroups: Record<string, number> = {
    'SP': 1, 'RJ': 1, 'ES': 1, 'MG': 1,
    'PR': 2, 'SC': 2, 'RS': 2,
    'DF': 3, 'GO': 3, 'TO': 3, 'MT': 3, 'MS': 3,
    'BA': 4, 'SE': 4, 'PE': 4, 'AL': 4, 'PB': 4, 'RN': 4, 'CE': 4, 'PI': 4, 'MA': 4,
    'PA': 5, 'AM': 5,
  };

  const originGroup = regionGroups[origin] || 5;
  const destGroup = regionGroups[dest] || 5;
  const diff = Math.abs(originGroup - destGroup);

  const multipliers = [1.0, 1.2, 1.5, 1.8, 2.2];
  return multipliers[Math.min(diff, multipliers.length - 1)];
}

async function getFallbackRates(supabase: any, destZip: string): Promise<ShippingOption[]> {
  try {
    const cepResponse = await fetch(`https://viacep.com.br/ws/${destZip}/json/`);
    const cepData = await cepResponse.json();
    
    if (cepData?.erro) return getDefaultFallback();

    const { data: rateData } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('state_code', cepData.uf)
      .single();

    if (!rateData) return getDefaultFallback();

    const cost = parseFloat(String(rateData.cost));
    return [
      {
        carrier: 'Correios',
        service: 'PAC',
        service_code: '04510',
        cost: cost,
        estimated_days: parseInt(rateData.estimated_days) || 10,
        estimated_text: rateData.estimated_days || '7-10 dias úteis',
        is_free: false,
        original_cost: cost,
        quote_source: 'local',
      },
      {
        carrier: 'Correios',
        service: 'SEDEX',
        service_code: '04014',
        cost: cost * 1.8,
        estimated_days: Math.max(1, Math.ceil((parseInt(rateData.estimated_days) || 10) / 2.5)),
        estimated_text: `${Math.max(1, Math.ceil((parseInt(rateData.estimated_days) || 10) / 2.5))} dias úteis`,
        is_free: false,
        original_cost: cost * 1.8,
        quote_source: 'local',
      },
    ];
  } catch {
    return getDefaultFallback();
  }
}

function getDefaultFallback(): ShippingOption[] {
  return [
    {
      carrier: 'Correios',
      service: 'PAC',
      service_code: '04510',
      cost: 35.00,
      estimated_days: 10,
      estimated_text: '10 dias úteis',
      is_free: false,
      original_cost: 35.00,
      quote_source: 'local',
    },
    {
      carrier: 'Correios',
      service: 'SEDEX',
      service_code: '04014',
      cost: 55.00,
      estimated_days: 4,
      estimated_text: '4 dias úteis',
      is_free: false,
      original_cost: 55.00,
      quote_source: 'local',
    },
  ];
}

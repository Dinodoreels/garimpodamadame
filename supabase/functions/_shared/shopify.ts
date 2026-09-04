import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
};

export const SHOPIFY_API_VERSION = '2025-01';

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export async function getUserClient(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) throw new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Response(JSON.stringify({ error: 'Usuário não autenticado' }), { status: 401, headers: corsHeaders });
  return { client, user };
}

export async function assertAdmin(req: Request) {
  const { client, user } = await getUserClient(req);
  const { data, error } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (error || !data) {
    throw new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
  }
  return { user };
}

export interface ShopifyConfig {
  id: string;
  is_enabled: boolean;
  store_domain: string | null;
  sync_direction: 'push_only' | 'pull_only' | 'bidirectional';
  auto_sync: boolean;
  primary_source: 'system' | 'shopify';
  webhook_secret: string | null;
  default_location_id: string | null;
}

export async function getShopifyConfig(): Promise<ShopifyConfig | null> {
  const svc = getServiceClient();
  const { data } = await svc.from('shopify_config').select('*').limit(1).maybeSingle();
  return data as ShopifyConfig | null;
}

export async function shopifyFetch(
  config: ShopifyConfig,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<any> {
  const token = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (!token) throw new Error('SHOPIFY_ACCESS_TOKEN não configurado');
  if (!config.store_domain) throw new Error('Domínio da loja Shopify não configurado');

  const url = `https://${config.store_domain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
  const resp = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Shopify ${method} ${endpoint} ${resp.status}: ${text}`);
  }
  if (method === 'DELETE') return { success: true };
  return await resp.json();
}

export async function getDefaultLocationId(config: ShopifyConfig): Promise<string> {
  if (config.default_location_id) return config.default_location_id;
  const res = await shopifyFetch(config, 'locations.json');
  const loc = res.locations?.[0];
  if (!loc) throw new Error('Nenhuma location encontrada na Shopify');
  const svc = getServiceClient();
  await svc.from('shopify_config').update({ default_location_id: String(loc.id) }).eq('id', config.id);
  return String(loc.id);
}
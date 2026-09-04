import { corsHeaders, jsonResponse, getServiceClient, getShopifyConfig } from '../_shared/shopify.ts';

async function verifyHmac(_req: Request, raw: string, secret: string, sig: string | null): Promise<boolean> {
  if (!sig) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === sig;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const topic = req.headers.get('x-shopify-topic') || '';
    const sig = req.headers.get('x-shopify-hmac-sha256');
    const raw = await req.text();
    const config = await getShopifyConfig();
    if (!config?.is_enabled) return jsonResponse({ skipped: 'disabled' });

    if (config.webhook_secret) {
      const ok = await verifyHmac(req, raw, config.webhook_secret, sig);
      if (!ok) return jsonResponse({ error: 'Invalid HMAC' }, 401);
    }

    const payload = JSON.parse(raw || '{}');
    const svc = getServiceClient();

    if (topic === 'products/update' || topic === 'products/create') {
      await svc.from('shopify_sync_queue').insert({
        action: 'pull',
        shopify_product_id: String(payload.id),
        payload,
      });
    } else if (topic === 'products/delete') {
      const sid = String(payload.id);
      const { data: link } = await svc.from('shopify_product_links').select('product_id').eq('shopify_product_id', sid).maybeSingle();
      if (link?.product_id) {
        await svc.from('shopify_product_links').delete().eq('product_id', link.product_id);
      }
    } else if (topic === 'inventory_levels/update') {
      const itemId = String(payload.inventory_item_id);
      const { data: link } = await svc.from('shopify_product_links').select('variant_id').eq('shopify_inventory_item_id', itemId).maybeSingle();
      if (link?.variant_id) {
        await svc.from('product_variants').update({ inventory_quantity: payload.available ?? 0 }).eq('id', link.variant_id);
      }
    }
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
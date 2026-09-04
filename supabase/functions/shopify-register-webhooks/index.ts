import { corsHeaders, jsonResponse, assertAdmin, getShopifyConfig, shopifyFetch } from '../_shared/shopify.ts';

const TOPICS = ['products/update', 'products/delete', 'inventory_levels/update'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const config = await getShopifyConfig();
    if (!config?.is_enabled || !config.store_domain) {
      return jsonResponse({ error: 'Ative e configure a Shopify primeiro.' }, 400);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const address = `${supabaseUrl}/functions/v1/shopify-webhook`;

    const existing = await shopifyFetch(config, 'webhooks.json');
    const have = new Set((existing.webhooks || []).filter((w: any) => w.address === address).map((w: any) => w.topic));

    const created: string[] = [];
    for (const topic of TOPICS) {
      if (have.has(topic)) continue;
      await shopifyFetch(config, 'webhooks.json', 'POST', {
        webhook: { topic, address, format: 'json' },
      });
      created.push(topic);
    }
    return jsonResponse({ created, already: [...have] });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
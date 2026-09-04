import { corsHeaders, jsonResponse, getServiceClient, assertAdmin, getShopifyConfig, shopifyFetch } from '../_shared/shopify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const config = await getShopifyConfig();
    if (!config?.is_enabled) return jsonResponse({ error: 'Shopify desativada.' }, 400);

    const body = await req.json().catch(() => ({}));
    const { shopify_product_id, all } = body || {};
    const svc = getServiceClient();

    const ids: string[] = [];
    if (all) {
      const res = await shopifyFetch(config, 'products.json?limit=250&fields=id');
      for (const p of res.products || []) ids.push(String(p.id));
    } else if (shopify_product_id) {
      ids.push(String(shopify_product_id));
    } else {
      return jsonResponse({ error: 'Informe shopify_product_id ou all=true' }, 400);
    }

    let imported = 0;
    for (const sid of ids) {
      const r = await shopifyFetch(config, `products/${sid}.json`);
      const sp = r.product;
      if (!sp) continue;

      const { data: link } = await svc.from('shopify_product_links').select('product_id').eq('shopify_product_id', sid).is('variant_id', null).maybeSingle();
      let localId = link?.product_id as string | undefined;
      if (!localId) {
        const { data: byHandle } = await svc.from('products').select('id').eq('handle', sp.handle).maybeSingle();
        localId = byHandle?.id;
      }

      const productRow: any = {
        title: sp.title,
        handle: sp.handle,
        description: sp.body_html || '',
        vendor: sp.vendor || '',
        product_type: sp.product_type || '',
        status: sp.status === 'active' ? 'active' : (sp.status === 'archived' ? 'archived' : 'draft'),
      };

      if (localId) {
        await svc.from('products').update(productRow).eq('id', localId);
      } else {
        const { data: ins } = await svc.from('products').insert(productRow).select('id').single();
        localId = ins?.id;
      }
      if (!localId) continue;

      await svc.from('shopify_product_links').upsert({
        product_id: localId, variant_id: null,
        shopify_product_id: sid, sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'product_id,variant_id' });
      imported++;
    }
    return jsonResponse({ imported });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
import { corsHeaders, jsonResponse, getServiceClient, assertAdmin, getShopifyConfig } from '../_shared/shopify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const config = await getShopifyConfig();
    if (!config?.is_enabled) return jsonResponse({ error: 'Shopify desativada. Ative antes de exportar.' }, 400);

    const svc = getServiceClient();
    const { data: products, error } = await svc.from('products').select('id').order('created_at');
    if (error) throw error;

    const rows = (products || []).map((p) => ({ product_id: p.id, action: 'push' as const }));
    if (rows.length) {
      for (let i = 0; i < rows.length; i += 500) {
        await svc.from('shopify_sync_queue').insert(rows.slice(i, i + 500));
      }
    }
    await svc.from('shopify_config').update({ last_full_sync_at: new Date().toISOString() }).eq('id', config.id);
    return jsonResponse({ enqueued: rows.length, message: `${rows.length} produtos enfileirados para envio.` });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
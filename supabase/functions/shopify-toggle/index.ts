import { corsHeaders, jsonResponse, getServiceClient, assertAdmin } from '../_shared/shopify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { is_enabled, store_domain, sync_direction, auto_sync, primary_source } = body || {};
    const svc = getServiceClient();
    const { data: existing } = await svc.from('shopify_config').select('id').limit(1).maybeSingle();
    const update: any = {};
    if (typeof is_enabled === 'boolean') update.is_enabled = is_enabled;
    if (typeof store_domain === 'string') update.store_domain = store_domain.trim();
    if (sync_direction) update.sync_direction = sync_direction;
    if (typeof auto_sync === 'boolean') update.auto_sync = auto_sync;
    if (primary_source) update.primary_source = primary_source;

    if (existing) {
      await svc.from('shopify_config').update(update).eq('id', existing.id);
    } else {
      await svc.from('shopify_config').insert(update);
    }
    const { data: config } = await svc.from('shopify_config').select('*').limit(1).maybeSingle();
    return jsonResponse({ config });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
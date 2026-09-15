import { assertAdmin, corsHeaders, getConfig, getSupabaseAdmin, jsonResponse, logSync } from '../_shared/bling.ts';
import { accountKey, fetchBlingProductDetail, normalizeSku, productSnapshot } from '../_shared/bling-import.ts';

const slug = (name: string, remoteId: string) => `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'produto'}-bling-${remoteId}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const runId = typeof body?.run_id === 'string' ? body.run_id : '';
    const itemIds = Array.isArray(body?.item_ids) ? body.item_ids.filter((id: unknown) => typeof id === 'string').slice(0, 50) : [];
    if (!runId || !itemIds.length) return jsonResponse({ error: 'Selecione ao menos um produto da prévia.' }, 400);

    const supa = getSupabaseAdmin();
    const cfg = await getConfig();
    if (!cfg?.client_id || !cfg.is_active) return jsonResponse({ error: 'A conta do Bling não está conectada.' }, 400);
    const key = await accountKey(cfg.client_id, cfg.company_name);
    const { data: run } = await supa.from('bling_import_runs').select('*').eq('id', runId).maybeSingle();
    if (!run || run.account_key !== key) return jsonResponse({ error: 'Esta prévia pertence a outra conta do Bling. Faça uma nova busca.' }, 409);

    await supa.from('bling_import_runs').update({ status: 'applying', error_message: null }).eq('id', runId);
    const { data: items } = await supa.from('bling_import_items').select('*').eq('run_id', runId).in('id', itemIds).neq('classification', 'conflict');
    const results: any[] = [];

    for (const item of items ?? []) {
      if (['created', 'linked', 'updated'].includes(item.apply_status)) {
        results.push({ id: item.id, ok: true, skipped: true });
        continue;
      }
      try {
        const applyStartedAt = new Date().toISOString();
        const detailed = await fetchBlingProductDetail(item.bling_product_id);
        const remote = productSnapshot({ ...item.bling_data, ...detailed });
        const sku = remote.sku.trim();
        if (!normalizeSku(sku)) throw new Error('Produto sem SKU; corrija no Bling e faça uma nova busca.');

        let productId = item.local_product_id as string | null;
        let variantId = item.local_variant_id as string | null;
        let applyStatus = 'linked';

        if (!productId || !variantId) {
          const { data: product, error: productError } = await supa.from('products').insert({
            title: remote.name,
            description: remote.description,
            handle: slug(remote.name, remote.id),
            vendor: remote.brand,
            price: remote.price,
            status: 'draft',
            is_available: false,
            weight_grams: remote.weight_grams,
            width_cm: remote.width_cm,
            height_cm: remote.height_cm,
            length_cm: remote.length_cm,
          }).select('id').single();
          if (productError) throw productError;
          productId = product.id;
          const quantity = cfg.stock_authority === 'bling' && remote.stock != null ? Math.max(0, Math.trunc(Number(remote.stock))) : 0;
          const { data: variant, error: variantError } = await supa.from('product_variants').insert({
            product_id: productId,
            title: 'Default',
            sku,
            price: remote.price,
            cost: remote.cost,
            inventory_quantity: quantity,
            is_available: false,
            inventory_policy: 'deny',
          }).select('id').single();
          if (variantError) throw variantError;
          variantId = variant.id;
          if (remote.images.length) {
            await supa.from('product_images').insert(remote.images.map((url: string, position: number) => ({ product_id: productId, url, position, alt_text: remote.name })));
          }
          applyStatus = 'created';
        } else {
          const variantUpdates: Record<string, unknown> = {};
          if (cfg.price_authority === 'bling') variantUpdates.price = remote.price;
          if (cfg.stock_authority === 'bling' && remote.stock != null) variantUpdates.inventory_quantity = Math.max(0, Math.trunc(Number(remote.stock)));
          if (Object.keys(variantUpdates).length) {
            await supa.from('product_variants').update(variantUpdates).eq('id', variantId);
            if (cfg.price_authority === 'bling') await supa.from('products').update({ price: remote.price }).eq('id', productId);
            applyStatus = 'updated';
          }
        }

        const { error: linkError } = await supa.from('bling_product_links').upsert({
          product_id: productId,
          variant_id: variantId,
          bling_product_id: remote.id,
          bling_sku: sku,
          status: 'synced',
          last_pulled_at: new Date().toISOString(),
          last_error: null,
        }, { onConflict: 'product_id,variant_id' });
        if (linkError) throw linkError;

        // Pulling from Bling must not create a pending outbound echo for the same change.
        await supa.from('bling_sync_queue').delete().eq('product_id', productId).in('action', ['product', 'stock']).gte('created_at', applyStartedAt).eq('status', 'pending');

        await supa.from('bling_import_items').update({ local_product_id: productId, local_variant_id: variantId, apply_status: applyStatus, error_message: null, applied_at: new Date().toISOString() }).eq('id', item.id);
        results.push({ id: item.id, ok: true, status: applyStatus });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supa.from('bling_import_items').update({ apply_status: 'error', error_message: message }).eq('id', item.id);
        results.push({ id: item.id, ok: false, error: message });
      }
    }

    const failed = results.filter((result) => !result.ok).length;
    const { count: remaining } = await supa.from('bling_import_items').select('id', { count: 'exact', head: true }).eq('run_id', runId).eq('selected', true).in('apply_status', ['pending', 'error']);
    const done = !remaining;
    await supa.from('bling_import_runs').update({ status: done ? 'completed' : 'review', completed_at: done ? new Date().toISOString() : null, error_message: failed ? `${failed} item(ns) com erro` : null }).eq('id', runId);
    await logSync({ entity_type: 'import', entity_id: runId, action: 'apply', status: failed ? 'error' : 'success', response: { processed: results.length, failed }, error_message: failed ? `${failed} item(ns) com erro` : null });
    return jsonResponse({ processed: results.length, failed, results, completed: done, actor: userId });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

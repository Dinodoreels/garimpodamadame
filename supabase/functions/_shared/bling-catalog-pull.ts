import { getConfig, getSupabaseAdmin, logSync } from './bling.ts';
import { fetchAllBlingProducts, fetchBlingProductDetail, fetchBlingStock, normalizeSku, productSnapshot } from './bling-import.ts';
import { runAutomaticTikTokPublication } from './bling-auto-publish.ts';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
const APPLY_BATCH_SIZE = 3;

async function autoImportNewProducts(productIds: string[]) {
  if (!productIds.length) return { applied: 0, review: 0, failed: 0 };
  const token = Deno.env.get('BLING_CRON_TOKEN');
  const baseUrl = Deno.env.get('SUPABASE_URL');
  if (!token || !baseUrl) throw new Error('Automação interna do Bling não está configurada.');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const previewResponse = await fetch(`${baseUrl}/functions/v1/bling-import-preview`, {
    method: 'POST', headers, body: JSON.stringify({ product_ids: productIds.slice(0, 50) }),
  });
  const preview = await previewResponse.json().catch(() => ({}));
  if (!previewResponse.ok || !preview?.run_id) throw new Error(preview?.error ?? `Prévia automática falhou (${previewResponse.status}).`);

  const supa = getSupabaseAdmin();
  const { data: rows, error } = await supa.from('bling_import_items')
    .select('id, classification, bling_data')
    .eq('run_id', preview.run_id)
    .eq('selected', true);
  if (error) throw error;
  const safeIds = (rows ?? []).filter((row: any) => {
    const data = row.bling_data ?? {};
    return row.classification !== 'conflict'
      && Boolean(normalizeSku(data.sku))
      && Boolean(String(data.name ?? '').trim())
      && Number(data.price) > 0
      && Array.isArray(data.images)
      && data.images.length > 0;
  }).map((row: any) => row.id);
  let applied = 0;
  let failed = 0;
  for (let index = 0; index < safeIds.length; index += APPLY_BATCH_SIZE) {
    const applyResponse = await fetch(`${baseUrl}/functions/v1/bling-import-apply`, {
      method: 'POST', headers, body: JSON.stringify({ run_id: preview.run_id, item_ids: safeIds.slice(index, index + APPLY_BATCH_SIZE) }),
    });
    const result = await applyResponse.json().catch(() => ({}));
    if (!applyResponse.ok) throw new Error(result?.error ?? `Aplicação automática falhou (${applyResponse.status}).`);
    applied += Number(result.processed ?? 0) - Number(result.failed ?? 0);
    failed += Number(result.failed ?? 0);
  }
  const review = Math.max(0, (rows ?? []).length - safeIds.length + failed);
  return { applied, review, failed, run_id: preview.run_id };
}

async function persistImages(supa: any, productId: string, remoteId: string, urls: string[]) {
  const { data: existing } = await supa.from('product_images').select('url').eq('product_id', productId);
  const known = new Set((existing ?? []).map((row: { url: string }) => row.url));
  let added = 0;

  for (let index = 0; index < urls.length; index++) {
    const sourceUrl = urls[index];
    if (known.has(sourceUrl)) continue;
    try {
      const publicPath = `bling/${productId}/${remoteId}-auto-${index + 1}.jpg`;
      const { data: existingPublic } = supa.storage.from('product-images').getPublicUrl(publicPath);
      if (existingPublic?.publicUrl && known.has(existingPublic.publicUrl)) continue;
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`download ${response.status}`);
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.startsWith('image/')) throw new Error('arquivo não é uma imagem');
      const extension = contentType?.includes('png') ? 'png' : contentType?.includes('webp') ? 'webp' : 'jpg';
      const path = `bling/${productId}/${remoteId}-auto-${index + 1}.${extension}`;
      const { data: expectedPublic } = supa.storage.from('product-images').getPublicUrl(path);
      if (expectedPublic?.publicUrl && known.has(expectedPublic.publicUrl)) continue;
      const { error } = await supa.storage.from('product-images').upload(path, await response.arrayBuffer(), {
        contentType: contentType ?? 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supa.storage.from('product-images').getPublicUrl(path);
      if (!data?.publicUrl || known.has(data.publicUrl)) continue;
      const { error: imageError } = await supa.from('product_images').insert({
        product_id: productId,
        url: data.publicUrl,
        position: known.size + added,
        alt_text: null,
      });
      if (imageError) throw imageError;
      known.add(data.publicUrl);
      added++;
    } catch (error) {
      await logSync({ entity_type: 'product', entity_id: remoteId, action: 'auto_image', status: 'error', payload: { source_url: sourceUrl }, error_message: errorMessage(error) });
    }
  }
  return added;
}

export async function pullLinkedBlingProducts(options: { blingProductIds?: string[]; batchSize?: number } = {}) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg.refresh_token) throw new Error('Bling não está conectado.');
  if (!cfg.deposito_id) throw new Error('Escolha o depósito do Bling antes de atualizar o catálogo.');

  const { data: claimed, error: claimError } = await supa.rpc('claim_bling_catalog_sync');
  if (claimError) throw claimError;
  if (!claimed) return { skipped: true, reason: 'Outra atualização do Bling já está em andamento.' };

  const startedAt = new Date().toISOString();
  let processed = 0;
  let updated = 0;
  let failed = 0;
  let imagesAdded = 0;
  let newProducts = 0;
  let autoApplied = 0;
  let reviewPending = 0;

  try {
    let query = supa
      .from('bling_product_links')
      .select('id, product_id, variant_id, bling_product_id, bling_sku, last_pulled_at')
      .not('bling_product_id', 'is', null)
      .order('last_pulled_at', { ascending: true, nullsFirst: true });
    if (options.blingProductIds?.length) query = query.in('bling_product_id', options.blingProductIds);
    const { data: links, error: linksError } = await query.limit(Math.min(options.batchSize ?? 15, 50));
    if (linksError) throw linksError;

    const ids = (links ?? []).map((link: any) => String(link.bling_product_id));
    const balances = cfg.sync_stock && cfg.stock_authority === 'bling' && ids.length
      ? await fetchBlingStock(ids, cfg.deposito_id)
      : new Map<string, number>();

    for (const link of links ?? []) {
      processed++;
      const itemStartedAt = new Date().toISOString();
      try {
        const detail = await fetchBlingProductDetail(String(link.bling_product_id));
        const remote = productSnapshot(detail);
        const productUpdates: Record<string, unknown> = { title: remote.name };
        if (remote.description) productUpdates.description = remote.description;
        if (remote.brand) productUpdates.vendor = remote.brand;
        if (remote.product_type) productUpdates.product_type = remote.product_type;
        if (remote.weight_grams != null) productUpdates.weight_grams = Math.max(0, Math.round(remote.weight_grams));
        if (remote.width_cm != null) productUpdates.width_cm = Math.max(0, Math.round(remote.width_cm));
        if (remote.height_cm != null) productUpdates.height_cm = Math.max(0, Math.round(remote.height_cm));
        if (remote.length_cm != null) productUpdates.length_cm = Math.max(0, Math.round(remote.length_cm));
        const variantUpdates: Record<string, unknown> = {};
        if (remote.cost != null) variantUpdates.cost = remote.cost;
        if (cfg.sync_stock && cfg.stock_authority === 'bling') {
          const stock = balances.get(remote.id);
          if (stock != null) variantUpdates.inventory_quantity = Math.max(0, Math.trunc(stock));
        }
        if (cfg.sync_prices && cfg.price_authority === 'bling') {
          productUpdates.price = remote.price;
          variantUpdates.price = remote.price;
        }

        const [{ data: localProduct }, { data: localVariant }] = await Promise.all([
          supa.from('products').select('title, description, vendor, product_type, price, weight_grams, width_cm, height_cm, length_cm').eq('id', link.product_id).maybeSingle(),
          supa.from('product_variants').select('price, cost, inventory_quantity').eq('id', link.variant_id).maybeSingle(),
        ]);
        const localProductRecord = (localProduct ?? {}) as Record<string, unknown>;
        const localVariantRecord = (localVariant ?? {}) as Record<string, unknown>;
        const productChanged = Object.entries(productUpdates).some(([key, value]) => String(localProductRecord[key] ?? '') !== String(value ?? ''));
        const variantChanged = Object.entries(variantUpdates).some(([key, value]) => Number(localVariantRecord[key] ?? 0) !== Number(value ?? 0));

        if (productChanged) await supa.from('products').update(productUpdates).eq('id', link.product_id);
        if (variantChanged) await supa.from('product_variants').update(variantUpdates).eq('id', link.variant_id);
        imagesAdded += await persistImages(supa, link.product_id, remote.id, remote.images);
        await supa.from('bling_product_links').update({
          bling_sku: remote.sku || link.bling_sku,
          status: 'synced',
          last_pulled_at: new Date().toISOString(),
          last_error: null,
        }).eq('id', link.id);

        // Remove only outbound echoes created by this pull.
        await supa.from('bling_sync_queue').delete()
          .eq('product_id', link.product_id)
          .in('action', ['product', 'stock'])
          .eq('status', 'pending')
          .gte('created_at', itemStartedAt);
        if (productChanged || variantChanged) updated++;
      } catch (error) {
        failed++;
        const message = errorMessage(error);
        await supa.from('bling_product_links').update({ status: 'error', last_error: message }).eq('id', link.id);
        await logSync({ entity_type: 'product', entity_id: String(link.bling_product_id), action: 'auto_pull', status: 'error', error_message: message });
      }
    }

    const remoteProducts = options.blingProductIds?.length
      ? options.blingProductIds.map((id) => ({ id }))
      : await fetchAllBlingProducts();
    const { data: allLinks } = await supa.from('bling_product_links').select('bling_product_id');
    const linkedIds = new Set((allLinks ?? []).map((row: any) => String(row.bling_product_id)));
    const newProductIds = remoteProducts.map((row: any) => String(row?.id ?? '')).filter((id) => id && !linkedIds.has(id));
    newProducts = newProductIds.length;
    if (newProducts > 0) {
      try {
        const imported = await autoImportNewProducts(newProductIds);
        autoApplied = imported.applied;
        reviewPending = imported.review;
        await logSync({ entity_type: 'import', action: 'auto_apply_new', status: imported.failed ? 'error' : 'success', response: imported });
      } catch (error) {
        reviewPending = newProducts;
        failed++;
        await logSync({ entity_type: 'import', action: 'auto_apply_new', status: 'error', response: { count: newProducts }, error_message: errorMessage(error) });
      }
    }

    const summary = { processed, updated, failed, images_added: imagesAdded, new_products_found: newProducts, auto_applied: autoApplied, new_products_pending: reviewPending };
    const publication = await runAutomaticTikTokPublication((links ?? []).map((link: any) => link.product_id)).catch(async (error) => {
      await logSync({ entity_type: 'catalog', action: 'auto_publish_tiktok', status: 'error', error_message: errorMessage(error) });
      return { processed: 0, published: 0, pending: 0, errors: 1 };
    });
    await supa.from('bling_config').update({
      last_catalog_sync_at: new Date().toISOString(),
      last_catalog_sync_summary: summary,
      last_sync_at: new Date().toISOString(),
      last_error: failed ? `${failed} produto(s) com erro na atualização automática.` : null,
    }).eq('id', cfg.id);
    await logSync({ entity_type: 'catalog', action: 'auto_pull', status: failed ? 'error' : 'success', payload: { started_at: startedAt }, response: summary, error_message: failed ? `${failed} produto(s) com erro` : null });
    return { ...summary, tiktok_publication: publication };
  } finally {
    await supa.rpc('release_bling_catalog_sync');
  }
}
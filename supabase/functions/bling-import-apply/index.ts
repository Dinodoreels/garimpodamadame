import { assertAdmin, corsHeaders, getConfig, getSupabaseAdmin, jsonResponse, logSync } from '../_shared/bling.ts';
import { accountKey, fetchBlingProductDetail, fetchBlingStock, normalizeSku, productSnapshot } from '../_shared/bling-import.ts';
import { pushStockToBling } from '../_shared/bling-product-sync.ts';

const slug = (name: string, remoteId: string) => `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'produto'}-bling-${remoteId}`;

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code].filter((value) => typeof value === 'string' && value);
    if (parts.length) return parts.join(' — ');
    try {
      return JSON.stringify(error);
    } catch {
      return 'Erro desconhecido ao importar o produto.';
    }
  }
  return String(error);
};

const imageExtension = (contentType: string | null, sourceUrl: string) => {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('gif')) return 'gif';
  if (contentType?.includes('avif')) return 'avif';
  const sourceExtension = sourceUrl.match(/\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i)?.[1]?.toLowerCase();
  return sourceExtension === 'jpeg' ? 'jpg' : sourceExtension ?? 'jpg';
};

async function persistBlingImages(supa: any, productId: string, remoteId: string, urls: string[]) {
  const persisted: string[] = [];
  for (let index = 0; index < urls.length; index++) {
    const sourceUrl = urls[index];
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`download ${response.status}`);
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.startsWith('image/')) throw new Error('arquivo não é uma imagem');
      const extension = imageExtension(contentType, sourceUrl);
      const path = `bling/${productId}/${remoteId}-${index + 1}.${extension}`;
      const { error } = await supa.storage.from('product-images').upload(path, await response.arrayBuffer(), {
        contentType: contentType ?? `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        upsert: true,
      });
      if (error) throw error;
      const { data } = supa.storage.from('product-images').getPublicUrl(path);
      if (data?.publicUrl) persisted.push(data.publicUrl);
    } catch (error) {
      await logSync({
        entity_type: 'product',
        entity_id: remoteId,
        action: 'cache_image',
        status: 'error',
        payload: { source_url: sourceUrl },
        error_message: errorMessage(error),
      });
    }
  }
  return persisted;
}

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
    if (!cfg.deposito_id) return jsonResponse({ error: 'Escolha o depósito do Bling antes de aplicar o lote.' }, 400);
    const key = await accountKey(cfg.client_id, cfg.company_name);
    const { data: run } = await supa.from('bling_import_runs').select('*').eq('id', runId).maybeSingle();
    if (!run || run.account_key !== key) return jsonResponse({ error: 'Esta prévia pertence a outra conta do Bling. Faça uma nova busca.' }, 409);
    if (run.decision !== 'approved') return jsonResponse({ error: 'Aprove este lote e informe o motivo antes de aplicar os produtos e o estoque.' }, 409);

    await supa.from('bling_import_runs').update({ status: 'applying', error_message: null }).eq('id', runId);
    const { data: items } = await supa.from('bling_import_items').select('*').eq('run_id', runId).in('id', itemIds).neq('classification', 'conflict');
    const stockByProduct = cfg.stock_authority === 'bling'
      ? await fetchBlingStock((items ?? []).map((item) => String(item.bling_product_id)), cfg.deposito_id)
      : new Map<string, number>();
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
        const freshStock = stockByProduct.get(remote.id);
        if (freshStock != null) remote.stock = freshStock;
        const sku = remote.sku.trim();
        if (!normalizeSku(sku)) throw new Error('O SKU automático não foi confirmado no Bling. Faça uma nova busca antes de aplicar.');
        const missingFields = [
          !remote.images.length && 'fotos',
          !remote.name && 'título',
          !remote.description && 'descrição',
          !remote.product_type && 'tipo',
          !(Number(remote.price) > 0) && 'preço',
          remote.cost == null && 'custo',
          !remote.brand && 'marca',
          remote.weight_grams == null && 'peso',
          remote.width_cm == null && 'largura',
          remote.height_cm == null && 'altura',
          remote.length_cm == null && 'comprimento',
          remote.stock == null && 'estoque',
        ].filter(Boolean);

        let productId = item.local_product_id as string | null;
        let variantId = item.local_variant_id as string | null;
        let applyStatus = 'linked';

        // A previous attempt may have created the draft before failing to link it.
        // Recover it by the stable Bling handle instead of creating a duplicate.
        if (!productId) {
          const { data: existingProduct, error: existingProductError } = await supa
            .from('products')
            .select('id')
            .eq('handle', slug(remote.name, remote.id))
            .maybeSingle();
          if (existingProductError) throw existingProductError;
          productId = existingProduct?.id ?? null;
        }
        if (productId && !variantId) {
          const { data: existingVariant, error: existingVariantError } = await supa
            .from('product_variants')
            .select('id')
            .eq('product_id', productId)
            .eq('sku', sku)
            .maybeSingle();
          if (existingVariantError) throw existingVariantError;
          variantId = existingVariant?.id ?? null;
        }

        if (!productId || !variantId) {
          if (!productId) {
            const { data: product, error: productError } = await supa.from('products').insert({
              title: remote.name,
              description: remote.description,
              handle: slug(remote.name, remote.id),
              vendor: remote.brand,
              product_type: remote.product_type,
              price: remote.price,
              status: 'draft',
              is_available: false,
              weight_grams: remote.weight_grams == null ? null : Math.max(0, Math.round(Number(remote.weight_grams))),
              width_cm: remote.width_cm == null ? null : Math.max(0, Math.round(Number(remote.width_cm))),
              height_cm: remote.height_cm == null ? null : Math.max(0, Math.round(Number(remote.height_cm))),
              length_cm: remote.length_cm == null ? null : Math.max(0, Math.round(Number(remote.length_cm))),
            }).select('id').single();
            if (productError) throw productError;
            productId = product.id;
          }
          const quantity = cfg.stock_authority === 'bling' && remote.stock != null ? Math.max(0, Math.trunc(Number(remote.stock))) : 0;
          if (!variantId) {
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

        let hasProductImage = false;
        if (remote.images.length) {
          const stableImages = await persistBlingImages(supa, productId, remote.id, remote.images);
          const imagesToSave = stableImages.length ? stableImages : remote.images;
          const { data: existingImages, error: existingImagesError } = await supa
            .from('product_images')
            .select('url')
            .eq('product_id', productId);
          if (existingImagesError) throw existingImagesError;
          const existingUrls = new Set((existingImages ?? []).map((image: { url: string }) => image.url));
          hasProductImage = existingUrls.size > 0 || imagesToSave.length > 0;
          const missingImages = imagesToSave
            .filter((url: string) => !existingUrls.has(url))
            .map((url: string, index: number) => ({ product_id: productId, url, position: existingUrls.size + index, alt_text: remote.name }));
          if (missingImages.length) {
            const { error: imageError } = await supa.from('product_images').insert(missingImages);
            if (imageError) throw imageError;
          }
        }

        const { data: publishVariant } = await supa.from('product_variants').select('inventory_quantity').eq('id', variantId).single();
        if (!hasProductImage) {
          const { count } = await supa.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', productId);
          hasProductImage = Number(count ?? 0) > 0;
        }
        // Products with a valid SKU and price remain visible even when the source has
        // not supplied media yet. The storefront already renders a clear no-image
        // state, while stock still controls whether purchasing is allowed.
        const publishable = Boolean(normalizeSku(sku))
          && Number(remote.price) > 0;
        const availableForSale = publishable && Number(publishVariant?.inventory_quantity ?? 0) > 0;
        await supa.from('products').update({
          title: remote.name,
          description: remote.description,
          vendor: remote.brand,
          product_type: remote.product_type,
          price: remote.price,
          weight_grams: remote.weight_grams == null ? null : Math.max(0, Math.round(Number(remote.weight_grams))),
          width_cm: remote.width_cm == null ? null : Math.max(0, Math.round(Number(remote.width_cm))),
          height_cm: remote.height_cm == null ? null : Math.max(0, Math.round(Number(remote.height_cm))),
          length_cm: remote.length_cm == null ? null : Math.max(0, Math.round(Number(remote.length_cm))),
          status: publishable ? 'active' : 'draft',
          is_available: availableForSale,
        }).eq('id', productId);
        await supa.from('product_variants').update({
          title: String(detailed?.variacao?.nome ?? detailed?.variacao ?? 'Default'),
          sku,
          cost: remote.cost,
          is_available: availableForSale,
        }).eq('id', variantId);

        const linkData = {
          product_id: productId,
          variant_id: variantId,
          bling_product_id: remote.id,
          bling_sku: sku,
          status: 'synced',
          last_pulled_at: new Date().toISOString(),
          last_error: null,
        };
        const { data: existingLink, error: existingLinkError } = await supa
          .from('bling_product_links')
          .select('id')
          .eq('product_id', productId)
          .eq('variant_id', variantId)
          .maybeSingle();
        if (existingLinkError) throw existingLinkError;
        const { error: linkError } = existingLink
          ? await supa.from('bling_product_links').update(linkData).eq('id', existingLink.id)
          : await supa.from('bling_product_links').insert(linkData);
        if (linkError) throw linkError;

        if (cfg.sync_stock && cfg.stock_authority === 'store') {
          const { data: localVariant, error: localStockError } = await supa
            .from('product_variants')
            .select('inventory_quantity, price')
            .eq('id', variantId)
            .single();
          if (localStockError) throw localStockError;
          await pushStockToBling(remote.id, Number(localVariant.inventory_quantity ?? 0), cfg.sync_prices && cfg.price_authority === 'store' ? Number(localVariant.price ?? 0) : undefined);
        }

        // Pulling from Bling must not create a pending outbound echo for the same change.
        await supa.from('bling_sync_queue').delete().eq('product_id', productId).in('action', ['product', 'stock']).gte('created_at', applyStartedAt).eq('status', 'pending');

        await supa.from('bling_import_items').update({ local_product_id: productId, local_variant_id: variantId, bling_data: { ...item.bling_data, ...remote, missing_fields: missingFields }, apply_status: applyStatus, error_message: missingFields.length ? `Pendente: ${missingFields.join(', ')}` : null, applied_at: new Date().toISOString() }).eq('id', item.id);
        results.push({ id: item.id, ok: true, status: applyStatus, published: publishable, available_for_sale: availableForSale, has_image: hasProductImage, missing_fields: missingFields });
      } catch (error) {
        const message = errorMessage(error);
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
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});

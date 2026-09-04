import { corsHeaders, jsonResponse, getServiceClient, getShopifyConfig, shopifyFetch, getDefaultLocationId, type ShopifyConfig } from '../_shared/shopify.ts';

const BATCH = 10;
const MAX_ATTEMPTS = 5;

async function buildProductPayload(svc: any, productId: string) {
  const { data: product } = await svc.from('products').select('*, suppliers(name)').eq('id', productId).single();
  if (!product) throw new Error('Produto não encontrado');
  const { data: variants } = await svc.from('product_variants').select('*').eq('product_id', productId).order('created_at');
  const { data: images } = await svc.from('product_images').select('*').eq('product_id', productId).order('position');

  const vendor = product.suppliers?.name || product.vendor || '';

  // Detect options
  const opt1Vals = [...new Set((variants || []).map((v: any) => v.option1).filter(Boolean))];
  const opt2Vals = [...new Set((variants || []).map((v: any) => v.option2).filter(Boolean))];
  const opt3Vals = [...new Set((variants || []).map((v: any) => v.option3).filter(Boolean))];
  const options: any[] = [];
  if (opt1Vals.length) options.push({ name: 'Option 1', values: opt1Vals });
  if (opt2Vals.length) options.push({ name: 'Option 2', values: opt2Vals });
  if (opt3Vals.length) options.push({ name: 'Option 3', values: opt3Vals });

  const shopifyVariants = (variants || []).map((v: any) => ({
    price: String(v.price ?? '0'),
    compare_at_price: v.compare_at_price ? String(v.compare_at_price) : null,
    sku: v.sku || '',
    option1: v.option1 || 'Default',
    option2: v.option2 || null,
    option3: v.option3 || null,
    inventory_management: 'shopify',
    inventory_quantity: v.inventory_quantity ?? 0,
    inventory_policy: v.inventory_policy || 'deny',
  }));

  return {
    product,
    variants: variants || [],
    images: images || [],
    payload: {
      title: product.title,
      body_html: product.description || '',
      vendor,
      product_type: product.product_type || '',
      handle: product.handle,
      status: product.status === 'draft' ? 'draft' : (product.status === 'archived' ? 'archived' : 'active'),
      options: options.length ? options : [{ name: 'Title', values: ['Default'] }],
      variants: shopifyVariants.length ? shopifyVariants : [{ price: String(product.price ?? '0'), option1: 'Default', inventory_management: 'shopify', inventory_quantity: 0 }],
      images: (images || []).map((img: any) => ({ src: img.url, alt: img.alt_text || undefined })),
    },
  };
}

async function pushProduct(svc: any, config: ShopifyConfig, productId: string) {
  const { product, variants, payload } = await buildProductPayload(svc, productId);

  // Existing link?
  const { data: existingLink } = await svc.from('shopify_product_links')
    .select('*').eq('product_id', productId).is('variant_id', null).maybeSingle();

  let shopifyProduct: any;
  if (existingLink?.shopify_product_id) {
    const res = await shopifyFetch(config, `products/${existingLink.shopify_product_id}.json`, 'PUT', {
      product: { id: Number(existingLink.shopify_product_id), ...payload },
    });
    shopifyProduct = res.product;
  } else {
    const res = await shopifyFetch(config, 'products.json', 'POST', { product: payload });
    shopifyProduct = res.product;
  }

  const shopifyPid = String(shopifyProduct.id);

  // Upsert product-level link
  await svc.from('shopify_product_links').upsert({
    product_id: productId,
    variant_id: null,
    shopify_product_id: shopifyPid,
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    last_error: null,
  }, { onConflict: 'product_id,variant_id' });

  // Map variants by sku/options
  const svBySku = new Map<string, any>();
  const svByOpts = new Map<string, any>();
  for (const sv of shopifyProduct.variants || []) {
    if (sv.sku) svBySku.set(String(sv.sku), sv);
    svByOpts.set(`${sv.option1 ?? ''}|${sv.option2 ?? ''}|${sv.option3 ?? ''}`, sv);
  }

  for (const v of variants) {
    const match = (v.sku && svBySku.get(String(v.sku))) ||
      svByOpts.get(`${v.option1 ?? 'Default'}|${v.option2 ?? ''}|${v.option3 ?? ''}`);
    if (!match) continue;
    await svc.from('shopify_product_links').upsert({
      product_id: productId,
      variant_id: v.id,
      shopify_product_id: shopifyPid,
      shopify_variant_id: String(match.id),
      shopify_inventory_item_id: match.inventory_item_id ? String(match.inventory_item_id) : null,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_error: null,
    }, { onConflict: 'product_id,variant_id' });
  }

  return { shopify_product_id: shopifyPid };
}

async function pushStock(svc: any, config: ShopifyConfig, variantId: string) {
  const { data: link } = await svc.from('shopify_product_links')
    .select('shopify_inventory_item_id').eq('variant_id', variantId).maybeSingle();
  if (!link?.shopify_inventory_item_id) return { skipped: 'no_link' };

  const { data: variant } = await svc.from('product_variants')
    .select('inventory_quantity').eq('id', variantId).single();
  if (!variant) return { skipped: 'no_variant' };

  const locId = await getDefaultLocationId(config);
  await shopifyFetch(config, 'inventory_levels/set.json', 'POST', {
    location_id: Number(locId),
    inventory_item_id: Number(link.shopify_inventory_item_id),
    available: variant.inventory_quantity ?? 0,
  });
  return { updated: true };
}

async function deleteFromShopify(svc: any, config: ShopifyConfig, shopifyPid: string, productId: string) {
  try {
    await shopifyFetch(config, `products/${shopifyPid}.json`, 'DELETE');
  } catch (_) { /* ignore 404 */ }
  await svc.from('shopify_product_links').delete().eq('product_id', productId);
  return { deleted: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const config = await getShopifyConfig();
    if (!config?.is_enabled) return jsonResponse({ skipped: 'disabled' });

    const svc = getServiceClient();
    const { data: jobs } = await svc.from('shopify_sync_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(BATCH);

    if (!jobs?.length) return jsonResponse({ processed: 0 });

    const results: any[] = [];
    for (const job of jobs) {
      await svc.from('shopify_sync_queue').update({ status: 'processing', attempts: job.attempts + 1 }).eq('id', job.id);
      try {
        let result: any;
        if (job.action === 'push' && job.product_id) {
          result = await pushProduct(svc, config, job.product_id);
        } else if (job.action === 'stock' && job.variant_id) {
          result = await pushStock(svc, config, job.variant_id);
        } else if (job.action === 'delete' && job.shopify_product_id) {
          result = await deleteFromShopify(svc, config, job.shopify_product_id, job.product_id);
        } else {
          throw new Error(`Ação inválida: ${job.action}`);
        }
        await svc.from('shopify_sync_queue').update({
          status: 'done',
          processed_at: new Date().toISOString(),
          last_error: null,
        }).eq('id', job.id);
        results.push({ id: job.id, ok: true, result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isMaxed = job.attempts + 1 >= MAX_ATTEMPTS;
        await svc.from('shopify_sync_queue').update({
          status: isMaxed ? 'error' : 'pending',
          last_error: msg,
          scheduled_at: isMaxed ? job.scheduled_at : new Date(Date.now() + 60_000 * (job.attempts + 1)).toISOString(),
        }).eq('id', job.id);
        if (job.product_id) {
          await svc.from('shopify_product_links').upsert({
            product_id: job.product_id,
            variant_id: null,
            sync_status: 'error',
            last_error: msg,
          }, { onConflict: 'product_id,variant_id' });
        }
        results.push({ id: job.id, ok: false, error: msg });
      }
    }

    return jsonResponse({ processed: results.length, results });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
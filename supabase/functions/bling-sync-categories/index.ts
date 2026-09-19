import { assertAdmin, corsHeaders, getSupabaseAdmin, jsonResponse, logSync } from '../_shared/bling.ts';
import { ensureBlingProductCategory } from '../_shared/bling-categories.ts';
import { syncProductToBling } from '../_shared/bling-product-sync.ts';

function isInternalCaller(req: Request) {
  const token = Deno.env.get('BLING_CRON_TOKEN');
  return Boolean(token) && req.headers.get('authorization') === `Bearer ${token}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!isInternalCaller(req)) await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const requestedIds = Array.isArray(body.product_ids)
      ? body.product_ids.filter((id: unknown): id is string => typeof id === 'string').slice(0, 100)
      : null;
    const supa = getSupabaseAdmin();
    let query = supa.from('products')
      .select('id,title,product_type')
      .eq('status', 'active')
      .not('product_type', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(100);
    if (requestedIds?.length) query = query.in('id', requestedIds);
    const [{ data: products, error }, { count: withoutCategory, error: countError }] = await Promise.all([
      query,
      supa.from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('product_type', null),
    ]);
    if (error) throw error;
    if (countError) throw countError;

    const categoryCache = new Map<string, { id: string; description: string; created: boolean }>();
    const results: Array<Record<string, unknown>> = [];
    for (const product of products ?? []) {
      const categoryName = String(product.product_type ?? '').trim();
      if (!categoryName) continue;
      try {
        const cacheKey = categoryName.toLocaleUpperCase('pt-BR');
        let category = categoryCache.get(cacheKey);
        if (!category) {
          category = await ensureBlingProductCategory(categoryName);
          categoryCache.set(cacheKey, category);
        }
        const sync = await syncProductToBling(product.id);
        results.push({ product_id: product.id, title: product.title, category, ok: true, sync });
      } catch (categoryError) {
        const message = categoryError instanceof Error ? categoryError.message : String(categoryError);
        results.push({ product_id: product.id, title: product.title, category: categoryName, ok: false, error: message });
        await logSync({ entity_type: 'category', entity_id: product.id, action: 'sync_product_category', status: 'error', payload: { category: categoryName }, error_message: message });
      }
    }

    return jsonResponse({
      processed: results.length,
      categories: [...categoryCache.values()],
      succeeded: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      without_category: withoutCategory ?? 0,
      results,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
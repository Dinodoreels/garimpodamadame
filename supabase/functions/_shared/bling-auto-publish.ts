import { getSupabaseAdmin, logSync } from './bling.ts';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

export async function runAutomaticTikTokPublication(productIds?: string[]) {
  const token = Deno.env.get('BLING_CRON_TOKEN');
  const baseUrl = Deno.env.get('SUPABASE_URL');
  if (!token || !baseUrl) throw new Error('Automação interna do TikTok não está configurada.');

  const supa = getSupabaseAdmin();
  let query = supa.from('products')
    .select('id,product_type,marketplace_category_mappings!products_product_type_fkey(id)')
    .eq('status', 'active')
    .not('suggestions_confirmed_at', 'is', null)
    .limit(25);
  if (productIds?.length) query = query.in('id', productIds.slice(0, 50));

  // Category eligibility is authoritatively checked by bling-publish-product.
  const { data: products, error } = await supa.from('products')
    .select('id')
    .eq('status', 'active')
    .not('suggestions_confirmed_at', 'is', null)
    .in('id', productIds?.length ? productIds.slice(0, 50) : (await supa.from('products').select('id').eq('status', 'active').not('suggestions_confirmed_at', 'is', null).limit(25)).data?.map((row) => row.id) ?? []);
  if (error) throw error;

  const results: Array<{ product_id: string; status: string; error?: string }> = [];
  for (const product of products ?? []) {
    try {
      const response = await fetch(`${baseUrl}/functions/v1/bling-publish-product`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, automatic: true }),
      });
      const result = await response.json().catch(() => ({}));
      const status = String(result?.status ?? (response.status === 409 ? 'pending' : response.ok ? 'published' : 'error'));
      results.push({ product_id: product.id, status, error: result?.error });
    } catch (error) {
      const message = errorMessage(error);
      results.push({ product_id: product.id, status: 'error', error: message });
      await logSync({ entity_type: 'product', entity_id: product.id, action: 'auto_publish_tiktok', status: 'error', error_message: message });
    }
  }
  return {
    processed: results.length,
    published: results.filter((item) => item.status === 'published').length,
    pending: results.filter((item) => item.status === 'pending').length,
    errors: results.filter((item) => item.status === 'error').length,
    results,
  };
}
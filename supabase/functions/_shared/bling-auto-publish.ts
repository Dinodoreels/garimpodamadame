import { getSupabaseAdmin, logSync } from './bling.ts';
import { getTikTokCategories, getTikTokChannel, normalizedCategoryName } from './bling-tiktok.ts';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

export async function runAutomaticTikTokPublication(productIds?: string[]) {
  const token = Deno.env.get('BLING_CRON_TOKEN');
  const baseUrl = Deno.env.get('SUPABASE_URL');
  if (!token || !baseUrl) throw new Error('Automação interna do TikTok não está configurada.');

  const supa = getSupabaseAdmin();
  const channel = await getTikTokChannel();
  if (!channel) return { processed: 0, published: 0, pending: 0, errors: 0, reason: 'A loja TikTok Shop não está ativa no Bling.', results: [] };
  const { data: savedChannel, error: channelError } = await supa.from('marketplace_channels').upsert({
    provider: 'tiktok', external_store_id: String(channel.id), name: channel.descricao ?? channel.nome ?? 'TikTok Shop',
    is_connected: true, raw_data: channel, last_synced_at: new Date().toISOString(),
  }, { onConflict: 'provider,external_store_id' }).select('id').single();
  if (channelError || !savedChannel) throw channelError ?? new Error('Não foi possível registrar o canal TikTok.');

  const categories = (await getTikTokCategories(channel)).filter((category) => category.is_leaf);
  const { data: localCategories } = await supa.from('products').select('product_type').eq('status', 'active').not('product_type', 'is', null);
  const uniqueLocalCategories = [...new Set((localCategories ?? []).map((row) => String(row.product_type).trim()).filter(Boolean))];
  for (const localCategory of uniqueLocalCategories) {
    const normalizedLocal = normalizedCategoryName(localCategory);
    const exactMatches = categories.filter((category) => normalizedCategoryName(category.name) === normalizedLocal);
    if (exactMatches.length !== 1) continue;
    const category = exactMatches[0];
    await supa.from('marketplace_category_mappings').upsert({
      channel_id: savedChannel.id,
      local_category_id: null,
      local_category_value: localCategory,
      marketplace_category_id: category.id,
      marketplace_category_name: category.name,
      required_attributes: category.required_attributes,
      attribute_mappings: {},
      confirmed_at: new Date().toISOString(),
      confirmed_by: null,
    }, { onConflict: 'channel_id,local_category_value', ignoreDuplicates: true });
  }

  let query = supa.from('products')
    .select('id')
    .eq('status', 'active')
    .not('suggestions_confirmed_at', 'is', null)
    .limit(25);
  if (productIds?.length) query = query.in('id', productIds.slice(0, 50));

  // Category eligibility is authoritatively checked by bling-publish-product.
  const { data: products, error } = await query;
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
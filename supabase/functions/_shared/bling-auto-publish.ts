import { getSupabaseAdmin, logSync } from './bling.ts';
import { getTikTokCategories, getTikTokChannel } from './bling-tiktok.ts';

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

  // Refresh availability from the real channel. Existing confirmed mappings are reused;
  // category names are never guessed or auto-confirmed.
  await getTikTokCategories(channel);

  let query = supa.from('products')
    .select('id,marketplace_product_publications!left(status,external_listing_id,channel_id)')
    .eq('status', 'active')
    .not('suggestions_confirmed_at', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(50);
  if (productIds?.length) query = query.in('id', productIds.slice(0, 50));

  // Category eligibility is authoritatively checked by bling-publish-product.
  const { data: products, error } = await query;
  if (error) throw error;

  const eligibleProducts = (products ?? []).filter((product: any) => {
    const publications = Array.isArray(product.marketplace_product_publications)
      ? product.marketplace_product_publications
      : [];
    return !publications.some((publication: any) =>
      publication.channel_id === savedChannel.id &&
      Boolean(publication.external_listing_id) &&
      ['published', 'pending'].includes(String(publication.status))
    );
  });

  const results: Array<{ product_id: string; status: string; error?: string }> = [];
  for (const product of eligibleProducts) {
    try {
      const response = await fetch(`${baseUrl}/functions/v1/bling-publish-product`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, automatic: true, let_bling_choose_category: true }),
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
    skipped_existing: (products ?? []).length - eligibleProducts.length,
    published: results.filter((item) => item.status === 'published').length,
    pending: results.filter((item) => item.status === 'pending').length,
    errors: results.filter((item) => item.status === 'error').length,
    results,
  };
}
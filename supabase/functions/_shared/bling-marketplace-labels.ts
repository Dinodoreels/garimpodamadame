import { blingError, callBling, getSupabaseAdmin, logSync } from './bling.ts';
import { callTikTok, getConfig as getTikTokConfig, logSync as logTikTokSync } from './tiktok.ts';

const cleanText = (value: unknown) => String(value ?? '').trim();

const isTikTok = (platform: string) => /tiktok/i.test(platform);

function findString(value: unknown, keys: string[]): string {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const found = cleanText(record[key]);
    if (found) return found;
  }
  for (const nested of Object.values(record)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const found = findString(item, keys);
        if (found) return found;
      }
    } else if (nested && typeof nested === 'object') {
      const found = findString(nested, keys);
      if (found) return found;
    }
  }
  return '';
}

async function getTikTokLabel(orderId: string) {
  const supa = getSupabaseAdmin();
  const { data: link } = await supa
    .from('bling_order_links')
    .select('raw_payload')
    .eq('order_id', orderId)
    .eq('direction', 'pull')
    .maybeSingle();
  const marketplaceOrderId = cleanText(link?.raw_payload?.numeroLoja);
  if (!marketplaceOrderId) {
    return { labelUrl: '', note: 'O pedido não trouxe o número original do TikTok Shop pelo Bling.', payload: {} };
  }

  const config = await getTikTokConfig();
  if (!config?.is_active || !config?.access_token || !config?.shop_cipher) {
    return {
      labelUrl: '',
      note: 'Conecte o TikTok Shop para autorizar a busca do PDF oficial desta etiqueta.',
      payload: { marketplace_order_id: marketplaceOrderId, connection_required: true },
    };
  }

  const packageResponse = await callTikTok({
    path: '/fulfillment/202309/packages/search',
    method: 'POST',
    body: { order_ids: [marketplaceOrderId], page_size: 20 },
  });
  const packageId = findString(packageResponse.data?.data, ['package_id', 'packageId']);
  if (packageResponse.status >= 400 || packageResponse.data?.code !== 0 || !packageId) {
    const providerMessage = cleanText(packageResponse.data?.message);
    return {
      labelUrl: '',
      note: providerMessage || 'O TikTok ainda não criou o pacote de envio deste pedido.',
      payload: { marketplace_order_id: marketplaceOrderId, package_search: packageResponse.data },
    };
  }

  const documentResponse = await callTikTok({
    path: `/fulfillment/202309/packages/${encodeURIComponent(packageId)}/shipping_documents`,
    query: {
      document_type: 'SHIPPING_LABEL',
      document_size: 'A6',
      document_format: 'PDF',
    },
  });
  const labelUrl = findString(documentResponse.data?.data, [
    'doc_url', 'document_url', 'shipping_label_url', 'label_url', 'url',
  ]);
  const providerMessage = cleanText(documentResponse.data?.message);
  await logTikTokSync({
    entity_type: 'shipping_label',
    entity_id: marketplaceOrderId,
    action: 'pull',
    status: labelUrl ? 'success' : 'pending',
    payload: { order_id: orderId, package_id: packageId },
    response: documentResponse.data,
    error_message: labelUrl ? undefined : providerMessage || 'Etiqueta ainda não liberada',
  });
  return {
    labelUrl,
    note: labelUrl ? null : providerMessage || 'O pacote existe, mas o TikTok ainda não liberou o PDF oficial.',
    payload: { marketplace_order_id: marketplaceOrderId, package_id: packageId, shipping_document: documentResponse.data },
  };
}

export async function syncMarketplaceLabel(orderId: string, blingOrderId: string, platform: string) {
  const supa = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    if (isTikTok(platform)) {
      const direct = await getTikTokLabel(orderId);
      const { data: existing } = await supa
        .from('marketplace_shipping_labels')
        .select('id, attempts, status, label_url')
        .eq('order_id', orderId)
        .maybeSingle();
      const row = {
        order_id: orderId,
        bling_order_id: blingOrderId,
        platform,
        status: direct.labelUrl ? 'ready' : 'pending',
        format: 'PDF',
        label_url: direct.labelUrl || null,
        provider_note: direct.note,
        provider_payload: direct.payload,
        attempts: Number(existing?.attempts ?? 0) + 1,
        last_error: null,
        last_checked_at: now,
      };
      const { error } = existing
        ? await supa.from('marketplace_shipping_labels').update(row).eq('id', existing.id)
        : await supa.from('marketplace_shipping_labels').insert(row);
      if (error) throw error;
      if (direct.labelUrl && existing?.status !== 'ready' && !existing?.label_url) {
        const { data: order } = await supa.from('orders').select('order_number').eq('id', orderId).maybeSingle();
        await supa.from('admin_notifications').insert({
          type: 'marketplace_label_ready',
          title: 'Etiqueta do TikTok liberada',
          message: `A etiqueta oficial do pedido ${order?.order_number ?? blingOrderId} está pronta para impressão.`,
          metadata: { order_id: orderId, order_number: order?.order_number ?? null, platform },
        });
      }
      await logSync({ entity_type: 'marketplace_label', entity_id: orderId, action: 'pull_tiktok', status: direct.labelUrl ? 'success' : 'pending', response: direct.payload, error_message: direct.note });
      return row;
    }

    const response = await callBling({
      path: '/logisticas/etiquetas',
      query: { formato: 'PDF', 'idsVendas[]': [blingOrderId] },
    });
    const label = Array.isArray(response.data?.data) ? response.data.data[0] : null;
    const labelUrl = cleanText(label?.link);
    const providerNote = cleanText(label?.observacao) || null;
    const unavailable = response.status === 404 || (response.status < 400 && !labelUrl);

    if (response.status >= 400 && !unavailable) throw new Error(blingError(response.status, response.data));

    const row = {
      order_id: orderId,
      bling_order_id: blingOrderId,
      platform,
      status: labelUrl ? 'ready' : 'unavailable',
      format: 'PDF',
      label_url: labelUrl || null,
      provider_note: providerNote,
      provider_payload: response.data ?? {},
      attempts: 1,
      last_error: null,
      last_checked_at: now,
    };
    const { data: existing } = await supa
      .from('marketplace_shipping_labels')
      .select('id, attempts, status, label_url')
      .eq('order_id', orderId)
      .maybeSingle();
    const { error } = existing
      ? await supa.from('marketplace_shipping_labels').update({ ...row, attempts: Number(existing.attempts ?? 0) + 1 }).eq('id', existing.id)
      : await supa.from('marketplace_shipping_labels').insert(row);
    if (error) throw error;

    if (labelUrl && existing?.status !== 'ready' && !existing?.label_url) {
      const { data: order } = await supa
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .maybeSingle();
      const { data: priorNotice } = await supa
        .from('admin_notifications')
        .select('id')
        .eq('type', 'marketplace_label_ready')
        .contains('metadata', { order_id: orderId })
        .limit(1)
        .maybeSingle();
      if (!priorNotice) {
        await supa.from('admin_notifications').insert({
          type: 'marketplace_label_ready',
          title: 'Etiqueta liberada',
          message: `A etiqueta oficial do pedido ${order?.order_number ?? blingOrderId} está pronta para impressão.`,
          metadata: { order_id: orderId, order_number: order?.order_number ?? null, platform },
        });
      }
    }

    await logSync({ entity_type: 'marketplace_label', entity_id: orderId, action: 'pull', status: labelUrl ? 'success' : 'pending', response: response.data });
    return { ...row, attempts: existing ? Number(existing.attempts ?? 0) + 1 : 1 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { data: existing } = await supa
      .from('marketplace_shipping_labels')
      .select('id, attempts')
      .eq('order_id', orderId)
      .maybeSingle();
    const row = {
      order_id: orderId,
      bling_order_id: blingOrderId,
      platform,
      status: 'error',
      format: 'PDF',
      attempts: Number(existing?.attempts ?? 0) + 1,
      last_error: message,
      last_checked_at: now,
    };
    if (existing) await supa.from('marketplace_shipping_labels').update(row).eq('id', existing.id);
    else await supa.from('marketplace_shipping_labels').insert(row);
    await logSync({ entity_type: 'marketplace_label', entity_id: orderId, action: 'pull', status: 'error', error_message: message });
    return row;
  }
}

export async function syncPendingMarketplaceLabels(limit = 20) {
  const supa = getSupabaseAdmin();
  const staleBefore = new Date(Date.now() - 4 * 60 * 1000).toISOString();
  const { data: labels, error } = await supa
    .from('marketplace_shipping_labels')
    .select('order_id, bling_order_id, platform, last_checked_at')
    .in('status', ['pending', 'unavailable', 'error'])
    .or(`last_checked_at.is.null,last_checked_at.lte.${staleBefore}`)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(Math.max(1, Math.min(limit, 50)));
  if (error) throw error;
  if (!labels?.length) return [];

  const orderIds = labels.map((label) => label.order_id);
  const { data: eligibleOrders, error: ordersError } = await supa
    .from('orders')
    .select('id')
    .in('id', orderIds)
    .not('status', 'in', '(cancelled,refunded)');
  if (ordersError) throw ordersError;
  const eligibleIds = new Set((eligibleOrders ?? []).map((order) => order.id));

  const results = [];
  for (const label of labels) {
    if (!eligibleIds.has(label.order_id)) continue;
    results.push(await syncMarketplaceLabel(label.order_id, String(label.bling_order_id), String(label.platform || 'Marketplace')));
  }
  return results;
}
import { blingError, callBling, getSupabaseAdmin, logSync } from './bling.ts';

const cleanText = (value: unknown) => String(value ?? '').trim();

export async function syncMarketplaceLabel(orderId: string, blingOrderId: string, platform: string) {
  const supa = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
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
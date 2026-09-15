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
      .select('id, attempts')
      .eq('order_id', orderId)
      .maybeSingle();
    const { error } = existing
      ? await supa.from('marketplace_shipping_labels').update({ ...row, attempts: Number(existing.attempts ?? 0) + 1 }).eq('id', existing.id)
      : await supa.from('marketplace_shipping_labels').insert(row);
    if (error) throw error;

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
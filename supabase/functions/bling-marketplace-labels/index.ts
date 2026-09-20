import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { assertAdmin, corsHeaders, getSupabaseAdmin, jsonResponse } from '../_shared/bling.ts';
import { syncMarketplaceLabel } from '../_shared/bling-marketplace-labels.ts';

const validIds = (value: unknown) => Array.isArray(value)
  ? value.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50)
  : [];

async function linkedOrders(orderIds: string[]) {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('bling_order_links')
    .select('order_id, bling_order_id, channel, direction')
    .in('order_id', orderIds)
    .eq('direction', 'pull');
  if (error) throw error;
  return data ?? [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? 'sync');
    const orderIds = validIds(body?.order_ids ?? (body?.order_id ? [body.order_id] : []));
    if (!orderIds.length) return jsonResponse({ error: 'Selecione ao menos um pedido válido.' }, 400);

    if (action === 'sync') {
      const links = await linkedOrders(orderIds);
      const results = [];
      for (const link of links) {
        results.push(await syncMarketplaceLabel(link.order_id, String(link.bling_order_id), String(link.channel || 'Marketplace')));
      }
      return jsonResponse({ synced: results.length, results, missing: orderIds.length - links.length });
    }

    const supa = getSupabaseAdmin();
    if (action === 'mark_printed') {
      await supa.from('marketplace_shipping_labels').update({ printed_at: new Date().toISOString() }).in('order_id', orderIds);
      return jsonResponse({ ok: true });
    }

    if (action === 'batch_pdf') {
      const { data: labels, error } = await supa
        .from('marketplace_shipping_labels')
        .select('order_id, label_url, status')
        .in('order_id', orderIds);
      if (error) throw error;
      const output = await PDFDocument.create();
      const included: string[] = [];
      const failed: string[] = [];
      const readyLabels = (labels ?? []).filter((label) => label.status === 'ready' && label.label_url);
      const pending = orderIds.filter((orderId) => !readyLabels.some((label) => label.order_id === orderId));
      for (const label of readyLabels) {
        try {
          const response = await fetch(String(label.label_url));
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const source = await PDFDocument.load(await response.arrayBuffer());
          const pages = await output.copyPages(source, source.getPageIndices());
          pages.forEach((page) => output.addPage(page));
          included.push(label.order_id);
        } catch {
          failed.push(label.order_id);
        }
      }
      if (!included.length) {
        return jsonResponse({
          ok: false,
          pending: true,
          message: 'As plataformas ainda não liberaram nenhuma etiqueta em PDF.',
          awaiting_order_ids: pending,
          failed,
        });
      }
      const bytes = await output.save();
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      await supa.from('marketplace_shipping_labels').update({ printed_at: new Date().toISOString() }).in('order_id', included);
      return jsonResponse({ ok: true, pdf_base64: btoa(binary), included, pending, failed });
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
import { z } from 'npm:zod@3.23.8';
import { assertAdmin, blingError, callBling, corsHeaders, getSupabaseAdmin, jsonResponse, logSync } from '../_shared/bling.ts';

const BodySchema = z.object({ order_id: z.string().uuid(), action: z.enum(['prepare', 'issue', 'sync']) });
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

function fiscalFields(raw: any) {
  const data = raw?.data ?? raw ?? {};
  const situation = String(data?.situacao?.valor ?? data?.situacao?.nome ?? data?.situacao ?? '').toLowerCase();
  const authorized = /autoriz|emitid/.test(situation) || Boolean(data?.chaveAcesso);
  return {
    status: authorized ? 'authorized' : (/rejeit|deneg/.test(situation) ? 'rejected' : 'processing'),
    invoice_number: String(data?.numero ?? '') || null,
    invoice_series: String(data?.serie ?? '') || null,
    access_key: String(data?.chaveAcesso ?? '') || null,
    danfe_url: data?.linkDanfe ?? data?.danfe?.url ?? null,
    xml_url: data?.linkXML ?? data?.xml?.url ?? null,
    authorized_at: authorized ? new Date().toISOString() : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const actor = await assertAdmin(req);
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return jsonResponse({ ok: false, error: 'Pedido ou ação inválida.' }, 400);
    const { order_id, action } = parsed.data;
    const supa = getSupabaseAdmin();
    const { data: order, error } = await supa.from('orders').select('*, order_items(*), profiles:user_id(full_name, cpf, phone)').eq('id', order_id).maybeSingle();
    if (error || !order) return jsonResponse({ ok: false, error: 'Pedido não encontrado.' }, 404);
    const guest = order.guest_info ?? {};
    const profile = order.profiles ?? {};
    const address = order.shipping_address ?? {};
    const recipient = { name: profile.full_name ?? guest.name ?? address.recipient_name, document: profile.cpf ?? guest.cpf, email: guest.email ?? null, phone: profile.phone ?? guest.phone ?? null, address };
    const problems: string[] = [];
    if (!recipient.name) problems.push('Nome do cliente');
    if (![11, 14].includes(digits(recipient.document).length)) problems.push('CPF ou CNPJ válido do cliente');
    for (const [key, label] of Object.entries({ street: 'Rua', number: 'Número', neighborhood: 'Bairro', city: 'Cidade', state: 'Estado', zip_code: 'CEP' })) if (!address[key]) problems.push(`${label} do endereço`);
    if (!Array.isArray(order.order_items) || !order.order_items.length) problems.push('Itens do pedido');
    const { data: settings } = await supa.from('fiscal_settings').select('*').limit(1).maybeSingle();
    if (!settings?.tax_id || !settings?.legal_name || !settings?.tax_regime) problems.push('Dados fiscais da empresa nas Configurações');

    let { data: doc } = await supa.from('fiscal_documents').select('*').eq('order_id', order_id).maybeSingle();
    const initialStatus = problems.length ? 'pending_data' : 'ready';
    if (!doc) {
      const created = await supa.from('fiscal_documents').insert({ order_id, status: initialStatus, recipient_snapshot: recipient, validation_errors: problems, requested_by: actor }).select().single();
      if (created.error) throw created.error;
      doc = created.data;
    } else if (action === 'prepare') {
      const updated = await supa.from('fiscal_documents').update({ status: initialStatus, recipient_snapshot: recipient, validation_errors: problems, error_message: null }).eq('id', doc.id).select().single();
      if (updated.error) throw updated.error;
      doc = updated.data;
    }

    if (action === 'prepare') {
      await supa.from('fiscal_document_events').insert({ fiscal_document_id: doc.id, event_type: 'validation', status: initialStatus, message: problems.length ? `Pendências: ${problems.join(', ')}` : 'Dados prontos para emissão', created_by: actor });
      return jsonResponse({ ok: true, document: doc });
    }
    if (problems.length) return jsonResponse({ ok: false, error: `Corrija: ${problems.join(', ')}` }, 409);
    if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) return jsonResponse({ ok: false, error: 'A nota só pode ser emitida após a confirmação do pagamento.' }, 409);

    let invoiceId = doc.bling_invoice_id;
    if (action === 'issue' && !invoiceId) {
      const { data: link } = await supa.from('bling_order_links').select('bling_order_id').eq('order_id', order_id).maybeSingle();
      if (!link?.bling_order_id) return jsonResponse({ ok: false, error: 'Envie este pedido ao Bling antes de emitir a nota.' }, 409);
      const created = await callBling({ path: '/nfe', method: 'POST', body: { pedidoVenda: { id: Number(link.bling_order_id) }, serie: Number(settings.invoice_series), naturezaOperacao: { descricao: settings.operation_nature } } });
      if (created.status >= 400) throw new Error(blingError(created.status, created.data));
      invoiceId = String(created.data?.data?.id ?? '');
      if (!invoiceId) throw new Error('O Bling não retornou o número interno da nota.');
      await supa.from('fiscal_documents').update({ bling_invoice_id: invoiceId, status: 'processing', issued_at: new Date().toISOString(), error_message: null }).eq('id', doc.id);
      const sent = await callBling({ path: `/nfe/${invoiceId}/enviar`, method: 'POST' });
      if (sent.status >= 400) throw new Error(blingError(sent.status, sent.data));
      await supa.from('fiscal_document_events').insert({ fiscal_document_id: doc.id, event_type: 'issue', status: 'processing', message: 'Nota enviada para autorização pelo Bling', provider_payload: sent.data, created_by: actor });
    }
    if (!invoiceId) return jsonResponse({ ok: false, error: 'Nota ainda não criada no Bling.' }, 409);
    const fetched = await callBling({ path: `/nfe/${invoiceId}` });
    if (fetched.status >= 400) throw new Error(blingError(fetched.status, fetched.data));
    const fields = fiscalFields(fetched.data);
    const updated = await supa.from('fiscal_documents').update({ ...fields, error_message: null }).eq('id', doc.id).select().single();
    await supa.from('fiscal_document_events').insert({ fiscal_document_id: doc.id, event_type: 'sync', status: fields.status, message: fields.status === 'authorized' ? 'Nota autorizada pela SEFAZ' : 'Situação consultada no Bling', provider_payload: fetched.data, created_by: actor });
    await logSync({ entity_type: 'fiscal_document', entity_id: order_id, action, status: fields.status, response: fetched.data });
    return jsonResponse({ ok: true, document: updated.data });
  } catch (error) {
    if (error instanceof Response) return new Response(await error.text(), { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const message = error instanceof Error ? error.message : 'Erro fiscal inesperado';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
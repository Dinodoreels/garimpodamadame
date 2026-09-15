import { z } from 'npm:zod@3.23.8';
import { assertAdmin, blingError, callBling, corsHeaders, getSupabaseAdmin, jsonResponse, logSync } from '../_shared/bling.ts';

const BodySchema = z.object({ order_id: z.string().uuid(), action: z.enum(['prepare', 'issue', 'sync']) });
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

type ValidationItem = { category: 'empresa' | 'bling' | 'produto' | 'cliente' | 'pedido' | 'pagamento'; label: string; fix_path?: string };
const problemLabels = (items: ValidationItem[]) => items.map((item) => item.label);
const nonEmpty = (value: unknown) => String(value ?? '').trim().length > 0;

const INTERMEDIARY_PLATFORMS: Record<string, string> = { '27415911000136': 'TikTok Shop' };

function fiscalSaleOrigin(order: any, link: any, storeName?: string | null) {
  const payload = link?.raw_payload ?? {};
  const source = String(order.source ?? 'website');
  const intermediaryDocument = digits(payload?.intermediador?.cnpj);
  const rawChannel = String(link?.channel ?? payload?.loja?.nome ?? payload?.loja?.descricao ?? source.replace(/^bling:/i, '')).trim();
  const known = [
    [/tiktok|byte\s*dance/i, 'TikTok Shop'], [/mercado\s*livre|mercadolivre|meli/i, 'Mercado Livre'],
    [/shopee/i, 'Shopee'], [/magalu|magazine\s*luiza/i, 'Magalu'], [/amazon/i, 'Amazon'],
  ] as const;
  const marketplace = INTERMEDIARY_PLATFORMS[intermediaryDocument] ?? known.find(([pattern]) => pattern.test(rawChannel))?.[1];
  const externalOrder = String(payload?.numeroLoja ?? link?.bling_order_number ?? '').trim();
  if (source.startsWith('bling:')) {
    const platform = marketplace ?? (/^canal\s+\d+$/i.test(rawChannel) ? `Bling — ${rawChannel.toLowerCase()}` : rawChannel || 'Bling');
    return { platform, store_name: rawChannel || null, external_order_number: externalOrder || null, note: `Venda realizada pela plataforma ${platform}${externalOrder ? ` — pedido externo ${externalOrder}` : ''}.` };
  }
  if (source === 'store') return { platform: 'Loja Física', store_name: storeName ?? null, external_order_number: null, note: `Venda realizada na loja física${storeName ? ` ${storeName}` : ''}.` };
  if (source === 'whatsapp') return { platform: 'WhatsApp', store_name: null, external_order_number: null, note: 'Venda realizada pelo WhatsApp do Garimpo da Madame.' };
  if (source === 'manual') return { platform: 'Manual', store_name: storeName ?? null, external_order_number: null, note: 'Venda cadastrada manualmente no Garimpo da Madame.' };
  return { platform: 'Site Garimpo da Madame', store_name: null, external_order_number: null, note: 'Venda realizada no site Garimpo da Madame.' };
}

async function validateFiscalProduct(productId: string, title: string, supa: ReturnType<typeof getSupabaseAdmin>): Promise<ValidationItem[]> {
  const problems: ValidationItem[] = [];
  const { data: link } = await supa.from('bling_product_links').select('bling_product_id, bling_sku, status').eq('product_id', productId).not('bling_product_id', 'is', null).limit(1).maybeSingle();
  if (!link?.bling_product_id || link.status === 'error') {
    return [{ category: 'produto', label: `${title}: produto sem vínculo válido com o Bling`, fix_path: `/admin/products?product=${productId}` }];
  }
  const fetched = await callBling({ path: `/produtos/${link.bling_product_id}` });
  if (fetched.status >= 400) {
    return [{ category: 'produto', label: `${title}: não foi possível conferir o cadastro fiscal no Bling`, fix_path: `/admin/products?product=${productId}` }];
  }
  const product = fetched.data?.data ?? fetched.data ?? {};
  const taxation = product.tributacao ?? product.dadosTributarios ?? {};
  const ncm = taxation.ncm ?? product.ncm;
  const origin = taxation.origem ?? product.origem;
  const unit = product.unidade ?? product.unidadeMedida;
  const missing: string[] = [];
  if (digits(ncm).length !== 8) missing.push('NCM');
  if (!nonEmpty(origin) && origin !== 0) missing.push('origem da mercadoria');
  if (!nonEmpty(unit)) missing.push('unidade');
  if (!nonEmpty(link.bling_sku)) missing.push('SKU');
  if (missing.length) problems.push({ category: 'produto', label: `${title}: falta ${missing.join(', ')} no Bling`, fix_path: `/admin/products?product=${productId}` });
  return problems;
}

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
    const problems: ValidationItem[] = [];
    if (!recipient.name) problems.push({ category: 'cliente', label: 'Nome do cliente', fix_path: '/admin/customers' });
    if (![11, 14].includes(digits(recipient.document).length)) problems.push({ category: 'cliente', label: 'CPF ou CNPJ válido do cliente', fix_path: '/admin/customers' });
    for (const [key, label] of Object.entries({ street: 'Rua', number: 'Número', neighborhood: 'Bairro', city: 'Cidade', state: 'Estado', zip_code: 'CEP' })) if (!address[key]) problems.push({ category: 'cliente', label: `${label} do endereço`, fix_path: '/admin/customers' });
    if (!Array.isArray(order.order_items) || !order.order_items.length) problems.push({ category: 'pedido', label: 'Itens do pedido' });
    if (!Number.isFinite(Number(order.total)) || Number(order.total) <= 0) problems.push({ category: 'pedido', label: 'Total válido do pedido' });
    if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) problems.push({ category: 'pagamento', label: 'Pagamento confirmado' });
    const { data: settings } = await supa.from('fiscal_settings').select('*').limit(1).maybeSingle();
    if (!settings) {
      problems.push({ category: 'empresa', label: 'Cadastre os dados fiscais da empresa', fix_path: '/admin/settings?section=fiscal' });
    } else {
      if (digits(settings.tax_id).length !== 14) problems.push({ category: 'empresa', label: 'CNPJ válido da empresa', fix_path: '/admin/settings?section=fiscal' });
      for (const [key, label] of Object.entries({ legal_name: 'Razão social', tax_regime: 'Regime tributário', street: 'Rua da empresa', number: 'Número da empresa', neighborhood: 'Bairro da empresa', city: 'Cidade da empresa', state: 'UF da empresa', zip_code: 'CEP da empresa', invoice_series: 'Série da NF-e', operation_nature: 'Natureza da operação' })) if (!nonEmpty(settings[key])) problems.push({ category: 'empresa', label, fix_path: '/admin/settings?section=fiscal' });
      if (settings.fiscal_environment !== 'live' || !settings.production_enabled || !settings.homologation_confirmed_at) problems.push({ category: 'empresa', label: 'Homologação fiscal e liberação explícita da emissão real', fix_path: '/admin/settings?section=fiscal' });
    }
    const { data: blingConfig } = await supa.from('bling_config').select('is_active, access_token, refresh_token, company_name').limit(1).maybeSingle();
    if (!blingConfig?.is_active || !blingConfig?.access_token || !blingConfig?.refresh_token) problems.push({ category: 'bling', label: 'Conexão ativa com o Bling', fix_path: '/admin/settings?bling=1' });
    if (!blingConfig?.company_name) problems.push({ category: 'bling', label: 'Empresa emissora identificada no Bling', fix_path: '/admin/settings?bling=1' });
    const { data: orderLink } = await supa.from('bling_order_links').select('bling_order_id, bling_order_number, channel, raw_payload').eq('order_id', order_id).maybeSingle();
    if (!orderLink?.bling_order_id) problems.push({ category: 'bling', label: 'Pedido enviado e vinculado ao Bling', fix_path: '/admin/settings?bling=1' });
    const { data: store } = order.store_id ? await supa.from('stores').select('name').eq('id', order.store_id).maybeSingle() : { data: null };
    const saleOrigin = fiscalSaleOrigin(order, orderLink, store?.name);
    if (Array.isArray(order.order_items)) {
      for (const item of order.order_items) {
        if (!item.product_id) problems.push({ category: 'produto', label: `${item.product_title}: produto local não identificado` });
        else problems.push(...await validateFiscalProduct(item.product_id, item.product_title, supa));
      }
    }

    const validationDetails = {
      checked_at: new Date().toISOString(),
      safe_read_only: action === 'prepare',
      sale_origin: saleOrigin,
      categories: ['empresa', 'bling', 'produto', 'cliente', 'pedido', 'pagamento'].map((category) => ({ category, pending: problems.filter((item) => item.category === category).length })),
    };

    let { data: doc } = await supa.from('fiscal_documents').select('*').eq('order_id', order_id).maybeSingle();
    const initialStatus = problems.length ? 'pending_data' : 'ready';
    if (!doc) {
      const created = await supa.from('fiscal_documents').insert({ order_id, status: initialStatus, recipient_snapshot: { ...recipient, sale_origin: saleOrigin }, validation_errors: problems, validation_details: validationDetails, validated_at: validationDetails.checked_at, fiscal_environment: settings?.fiscal_environment ?? 'test', requested_by: actor }).select().single();
      if (created.error) throw created.error;
      doc = created.data;
    } else if (action === 'prepare') {
      const updated = await supa.from('fiscal_documents').update({ status: initialStatus, recipient_snapshot: { ...recipient, sale_origin: saleOrigin }, validation_errors: problems, validation_details: validationDetails, validated_at: validationDetails.checked_at, fiscal_environment: settings?.fiscal_environment ?? 'test', error_message: null }).eq('id', doc.id).select().single();
      if (updated.error) throw updated.error;
      doc = updated.data;
    }

    if (action === 'prepare') {
      await supa.from('fiscal_document_events').insert({ fiscal_document_id: doc.id, event_type: 'validation', status: initialStatus, message: problems.length ? `Pendências: ${problemLabels(problems).join(', ')}` : 'Dados prontos para emissão', provider_payload: validationDetails, created_by: actor });
      return jsonResponse({ ok: true, document: doc });
    }
    if (problems.length) return jsonResponse({ ok: false, error: `Corrija: ${problemLabels(problems).join(', ')}` }, 409);
    if (action === 'issue' && (settings?.fiscal_environment !== 'live' || settings?.production_enabled !== true || !settings?.homologation_confirmed_at)) {
      return jsonResponse({ ok: false, error: 'A emissão real está bloqueada. Conclua a homologação e libere a produção nas configurações fiscais.' }, 409);
    }
    if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) return jsonResponse({ ok: false, error: 'A nota só pode ser emitida após a confirmação do pagamento.' }, 409);

    let invoiceId = doc.bling_invoice_id;
    if (action === 'issue' && !invoiceId) {
      const { data: link } = await supa.from('bling_order_links').select('bling_order_id').eq('order_id', order_id).maybeSingle();
      if (!link?.bling_order_id) return jsonResponse({ ok: false, error: 'Envie este pedido ao Bling antes de emitir a nota.' }, 409);
      const created = await callBling({ path: '/nfe', method: 'POST', body: { pedidoVenda: { id: Number(link.bling_order_id) }, observacoes: saleOrigin.note } });
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
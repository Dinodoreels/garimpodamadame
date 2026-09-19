// Order flows between the store and Bling.
import { blingError, callBling, getConfig, getSupabaseAdmin, logSync } from "./bling.ts";
import { syncMarketplaceLabel } from './bling-marketplace-labels.ts';
import { applyOrderStock } from './order-stock.ts';

const onlyDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

const INTERMEDIARY_PLATFORMS: Record<string, string> = {
  '27415911000136': 'TikTok Shop',
};

function marketplaceName(order: any, channels: Map<string, string>) {
  const intermediaryDocument = onlyDigits(order?.intermediador?.cnpj);
  if (INTERMEDIARY_PLATFORMS[intermediaryDocument]) return INTERMEDIARY_PLATFORMS[intermediaryDocument];
  const storeId = String(order?.loja?.id ?? '').trim();
  const value = String(order?.loja?.nome ?? order?.loja?.descricao ?? channels.get(storeId) ?? '').trim();
  const known = [
    [/tiktok|byte\s*dance/i, 'TikTok Shop'],
    [/mercado\s*livre|mercadolivre|meli/i, 'Mercado Livre'],
    [/shopee/i, 'Shopee'],
    [/magalu|magazine\s*luiza/i, 'Magalu'],
    [/amazon/i, 'Amazon'],
  ] as const;
  return known.find(([pattern]) => pattern.test(value))?.[1]
    ?? value
    ?? (storeId ? `canal ${storeId}` : 'Bling');
}

function marketplaceOrderReference(order: any): string | null {
  const value = String(
    order?.numeroLoja ?? order?.numeroPedidoLoja ?? order?.pedidoLoja?.numero ?? '',
  ).trim();
  return value || null;
}

function externalOrderKey(channelName: string, order: any): string | null {
  const reference = marketplaceOrderReference(order);
  if (!reference) return null;
  const channel = channelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `marketplace:${channel}:${reference}`;
}

async function accountMarketplaceStock(
  supa: ReturnType<typeof getSupabaseAdmin>,
  orderId: string,
  blingId: string,
  channelName: string,
) {
  const result = await applyOrderStock(supa, orderId, `bling:${channelName.toLowerCase()}`);
  await logSync({
    entity_type: 'order',
    entity_id: blingId,
    action: 'stock_transition',
    status: result.blocked ? 'blocked' : 'success',
    response: result,
    error_message: result.blocked ? 'Estoque do pedido requer revisão administrativa' : null,
  });
  return result;
}

/** Find or create a Bling contact for a store order. */
async function ensureContact(name: string, doc: string | null, email: string | null, phone: string | null) {
  const documento = onlyDigits(doc);
  if (documento) {
    const { status, data } = await callBling({ path: "/contatos", query: { numeroDocumento: documento, limite: 1 } });
    if (status < 400 && data?.data?.length) return Number(data.data[0].id);
  }
  const { status, data } = await callBling({
    path: "/contatos",
    method: "POST",
    body: {
      nome: (name || "Cliente da loja").slice(0, 120),
      tipo: documento.length > 11 ? "J" : "F",
      numeroDocumento: documento || undefined,
      email: email || undefined,
      celular: phone || undefined,
      situacao: "A",
    },
  });
  if (status >= 400) throw new Error(`Não foi possível cadastrar o cliente no Bling: ${blingError(status, data)}`);
  return Number(data?.data?.id);
}

/** Send a store order to Bling as a sales order. */
export async function pushOrderToBling(orderId: string) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg.push_orders) throw new Error("Envio de pedidos para o Bling está desligado.");

  const { data: existing } = await supa
    .from("bling_order_links")
    .select("id, bling_order_id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing?.bling_order_id) return { bling_order_id: existing.bling_order_id, skipped: true };

  const { data: order, error } = await supa
    .from("orders")
    .select("*, order_items(*), profiles:user_id(full_name, cpf, phone)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) throw new Error("Pedido não encontrado");

  const guest = (order.guest_info ?? {}) as any;
  const profile = (order.profiles ?? {}) as any;
  const address = (order.shipping_address ?? {}) as any;
  const contatoId = await ensureContact(
    profile.full_name ?? guest.name ?? address.recipient_name ?? "Cliente da loja",
    profile.cpf ?? guest.cpf ?? null,
    guest.email ?? null,
    profile.phone ?? guest.phone ?? null,
  );

  const itens = (order.order_items ?? []).map((i: any) => ({
    codigo: i.shopify_variant_id || i.shopify_product_id || undefined,
    descricao: [i.product_title, i.variant_title].filter(Boolean).join(" - ").slice(0, 120),
    quantidade: i.quantity,
    valor: Number(i.unit_price),
  }));
  if (!itens.length) throw new Error("Pedido sem itens");

  const payload: any = {
    numeroLoja: order.order_number,
    data: new Date(order.created_at).toISOString().slice(0, 10),
    contato: { id: contatoId },
    itens,
    ...(cfg.loja_id ? { loja: { id: Number(cfg.loja_id) } } : {}),
    ...(Number(order.shipping_cost) > 0
      ? { transporte: { frete: Number(order.shipping_cost) } }
      : {}),
    ...(Number(order.discount_amount) > 0 ? { desconto: { valor: Number(order.discount_amount) } } : {}),
    observacoes: `Pedido ${order.order_number} — loja online`,
  };

  const { status, data } = await callBling({ path: "/pedidos/vendas", method: "POST", body: payload, config: cfg });
  if (status >= 400) {
    const err = blingError(status, data);
    await logSync({ entity_type: "order", entity_id: orderId, action: "push", status: "error", payload, response: data, error_message: err });
    throw new Error(err);
  }

  const blingOrderId = String(data?.data?.id);
  const { error: linkError } = await supa.from("bling_order_links").upsert({
    order_id: orderId,
    bling_order_id: blingOrderId,
    bling_order_number: order.order_number,
    channel: "loja",
    direction: "push",
    raw_payload: data,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "order_id" });
  if (linkError) {
    const { data: raced } = await supa.from('bling_order_links').select('bling_order_id').eq('order_id', orderId).maybeSingle();
    if (raced?.bling_order_id) return { bling_order_id: raced.bling_order_id, skipped: true };
    throw linkError;
  }

  await logSync({ entity_type: "order", entity_id: orderId, action: "push", status: "success", payload, response: data });
  return { bling_order_id: blingOrderId };
}

const STATUS_MAP: Record<string, string> = {
  "6": "cancelled",
  "9": "paid",
  "10": "processing",
  "12": "shipped",
  "15": "shipped",
  "24": "paid",
};

function orderState(order: any) {
  const id = String(order?.situacao?.id ?? '');
  const label = String(order?.situacao?.valor ?? order?.situacao?.nome ?? order?.situacao?.descricao ?? '').toLowerCase();
  let status = STATUS_MAP[id] ?? 'pending';
  if (/cancel|estorn/.test(label)) status = 'cancelled';
  else if (/entreg|conclu/.test(label)) status = 'delivered';
  else if (/enviad|transport|despach/.test(label)) status = 'shipped';
  else if (/pago|aprov|atendid/.test(label)) status = 'paid';
  else if (/separa|process/.test(label)) status = 'processing';
  return { id, label, status };
}

function tracking(order: any) {
  const volume = order?.transporte?.volumes?.[0] ?? order?.transporte?.volume ?? {};
  const object = volume?.objetos?.[0] ?? {};
  return {
    code: String(object?.codigoRastreamento ?? volume?.codigoRastreamento ?? order?.transporte?.codigoRastreamento ?? '').trim() || null,
    url: String(object?.urlRastreamento ?? volume?.urlRastreamento ?? order?.transporte?.urlRastreamento ?? '').trim() || null,
  };
}

async function localVariant(supa: ReturnType<typeof getSupabaseAdmin>, item: any) {
  const blingProductId = String(item?.produto?.id ?? '');
  if (blingProductId) {
    const { data: link } = await supa.from('bling_product_links').select('product_id, variant_id').eq('bling_product_id', blingProductId).maybeSingle();
    if (link?.variant_id) return link;
  }
  const sku = String(item?.codigo ?? item?.produto?.codigo ?? '').trim();
  if (!sku) return null;
  const { data: variant } = await supa.from('product_variants').select('id, product_id').eq('sku', sku).maybeSingle();
  return variant ? { product_id: variant.product_id, variant_id: variant.id } : null;
}

type PullOrdersOptions = {
  sinceIso?: string;
  fullHistory?: boolean;
  days?: number;
};

function blingDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function blingOrderDate(order: any): string | null {
  const raw = order?.data ?? order?.dataCriacao ?? order?.dataVenda ?? null;
  if (!raw) return null;
  const parsed = new Date(String(raw).trim().replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Import marketplace orders that Bling received (Mercado Livre, Shopee, Magalu, Amazon, TikTok...). */
export async function pullMarketplaceOrders(options: PullOrdersOptions | string = {}) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg.pull_marketplace_orders) {
    return { skipped: true, reason: "importação de pedidos desligada" };
  }

  const normalizedOptions = typeof options === 'string' ? { sinceIso: options } : options;
  const fullHistory = normalizedOptions.fullHistory === true;
  const days = Math.min(365, Math.max(1, normalizedOptions.days ?? 90));
  const currentDate = new Date();
  const since = normalizedOptions.sinceIso
    ?? (fullHistory ? new Date(currentDate.getTime() - days * 24 * 3600 * 1000).toISOString() : cfg.last_order_pull_at)
    ?? new Date(currentDate.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const dataInicial = blingDate(new Date(since));
  const dataFinal = blingDate(currentDate);
  const channelResponse = await callBling({ path: '/canais-venda', query: { limite: 100 }, config: cfg });
  const channelMap = new Map<string, string>(
    (channelResponse.status < 400 && Array.isArray(channelResponse.data?.data) ? channelResponse.data.data : [])
      .map((channel: any) => [String(channel.id), String(channel.descricao ?? channel.nome ?? `canal ${channel.id}`)]),
  );

  const summaries = new Map<string, any>();
  for (let page = 1; page <= 100; page++) {
    const query = fullHistory
      ? { dataInicial, dataFinal, pagina: page, limite: 100 }
      : { dataAlteracaoInicial: `${dataInicial} 00:00:00`, pagina: page, limite: 100 };
    const { status, data } = await callBling({
      path: "/pedidos/vendas",
      query,
      config: cfg,
    });
    if (status >= 400) throw new Error(blingError(status, data));
    const rows = Array.isArray(data?.data) ? data.data : [];
    for (const row of rows) {
      const id = String(row?.id ?? '').trim();
      if (id) summaries.set(id, row);
    }
    if (rows.length < 100) break;
  }
  const list = [...summaries.values()];
  const imported: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const summary of list) {
    const blingId = String(summary.id);
    const { data: link } = await supa
      .from("bling_order_links")
      .select("id, order_id, direction")
      .eq("bling_order_id", blingId)
      .maybeSingle();
    const detail = await callBling({ path: `/pedidos/vendas/${blingId}`, config: cfg });
    if (detail.status >= 400) {
      const message = blingError(detail.status, detail.data);
      errors.push({ id: blingId, error: message });
      await logSync({ entity_type: 'order', entity_id: blingId, action: 'pull_detail', status: 'error', error_message: message });
      continue;
    }
    const o = detail.data?.data ?? {};

    const channelName = marketplaceName(o, channelMap);
    const items = o?.itens ?? [];
    const subtotal = items.reduce((s: number, i: any) => s + Number(i.valor ?? 0) * Number(i.quantidade ?? 1), 0);
    const shipping = Number(o?.transporte?.frete ?? 0);
    const total = Number(o?.total ?? subtotal + shipping);
    const mapped = orderState(o);
    const tracked = tracking(o);
    const now = new Date().toISOString();
    const orderExternalKey = externalOrderKey(String(channelName), o);
    const orderUpdates: Record<string, unknown> = {
      status: mapped.status,
      subtotal,
      shipping_cost: shipping,
      total,
      tracking_code: tracked.code,
      tracking_url: tracked.url,
      guest_info: {
        name: o?.contato?.nome ?? null,
        cpf: o?.contato?.numeroDocumento ?? null,
        email: o?.contato?.email ?? null,
        phone: o?.contato?.celular ?? o?.contato?.telefone ?? null,
        marketplace: channelName,
        bling_order_number: o?.numero ?? null,
      },
      shipping_address: o?.transporte?.etiqueta ? {
        recipient_name: o.transporte.etiqueta.nome ?? null,
        street: o.transporte.etiqueta.endereco ?? null,
        number: o.transporte.etiqueta.numero ?? null,
        complement: o.transporte.etiqueta.complemento ?? null,
        neighborhood: o.transporte.etiqueta.bairro ?? null,
        city: o.transporte.etiqueta.municipio ?? null,
        state: o.transporte.etiqueta.uf ?? null,
        zip_code: o.transporte.etiqueta.cep ?? null,
      } : null,
    };
    if (link?.direction !== 'push') orderUpdates.source = `bling:${String(channelName).toLowerCase()}`;
    if (['paid', 'processing', 'shipped', 'delivered'].includes(mapped.status)) orderUpdates.paid_at = o?.dataPagamento ?? now;
    if (['shipped', 'delivered'].includes(mapped.status)) orderUpdates.shipped_at = o?.dataSaida ?? now;
    if (mapped.status === 'delivered') orderUpdates.delivered_at = now;

    if (link?.order_id) {
      const { data: current, error: currentError } = await supa.from('orders').select('status').eq('id', link.order_id).maybeSingle();
      if (currentError) {
        errors.push({ id: blingId, error: currentError.message });
        continue;
      }
      const { error: updateError } = await supa.from('orders').update(orderUpdates).eq('id', link.order_id);
      if (updateError) {
        errors.push({ id: blingId, error: updateError.message });
        await logSync({ entity_type: 'order', entity_id: blingId, action: 'update', status: 'error', error_message: updateError.message });
        continue;
      }
      if (current?.status !== mapped.status) {
        await supa.from('order_status_history').insert({ order_id: link.order_id, status: mapped.status, note: `Atualizado pelo Bling (${channelName})` });
      }
      await accountMarketplaceStock(supa, link.order_id, blingId, String(channelName));
      await supa.from('bling_order_links').update({ bling_status: mapped.id, channel: String(channelName), raw_payload: o, last_synced_at: now }).eq('id', link.id);
      await syncMarketplaceLabel(link.order_id, blingId, String(channelName));
      updated.push(blingId);
      continue;
    }

    const { data: orderNumber } = await supa.rpc("generate_order_number");

    const { data: created, error: createErr } = await supa
      .from("orders")
      .insert({
        order_number: orderNumber,
        ...orderUpdates,
        external_order_key: orderExternalKey,
        stock_accounting_started_at: now,
        created_at: blingOrderDate(o) ?? now,
        payment_method: String(channelName).toLowerCase(),
      })
      .select("id")
      .single();
    if (createErr) {
      await logSync({ entity_type: "order", entity_id: blingId, action: "pull", status: "error", error_message: createErr.message });
      errors.push({ id: blingId, error: createErr.message });
      continue;
    }

    if (items.length) {
      const itemRows = [];
      for (const i of items) {
        const local = await localVariant(supa, i);
        itemRows.push({
          order_id: created.id,
          product_id: local?.product_id ?? null,
          variant_id: local?.variant_id ?? null,
          shopify_product_id: String(i?.produto?.id ?? i?.codigo ?? "bling"),
          shopify_variant_id: String(i?.codigo ?? i?.produto?.codigo ?? "bling"),
          product_title: i?.descricao ?? "Item",
          variant_title: i?.produto?.nome ?? null,
          quantity: Number(i?.quantidade ?? 1),
          unit_price: Number(i?.valor ?? 0),
          total_price: Number(i?.valor ?? 0) * Number(i?.quantidade ?? 1),
        });
      }
      const { error: itemsError } = await supa.from("order_items").insert(itemRows);
      if (itemsError) {
        errors.push({ id: blingId, error: itemsError.message });
        await logSync({ entity_type: 'order', entity_id: blingId, action: 'pull_items', status: 'error', error_message: itemsError.message });
        continue;
      }
    }

    const { error: linkError } = await supa.from("bling_order_links").upsert({
      order_id: created.id,
      bling_order_id: blingId,
      bling_order_number: String(o?.numero ?? ""),
      channel: String(channelName),
      direction: "pull",
      bling_status: mapped.id,
      raw_payload: o,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'bling_order_id' });
    if (linkError) {
      errors.push({ id: blingId, error: linkError.message });
      await logSync({ entity_type: 'order', entity_id: blingId, action: 'pull_link', status: 'error', error_message: linkError.message });
      continue;
    }

    await supa.from('order_status_history').insert({ order_id: created.id, status: mapped.status, note: `Importado do Bling (${channelName})` });
    await accountMarketplaceStock(supa, created.id, blingId, String(channelName));
    await syncMarketplaceLabel(created.id, blingId, String(channelName));

    imported.push(blingId);
  }

  await supa.from("bling_config")
    .update({ last_order_pull_at: new Date().toISOString(), last_sync_at: new Date().toISOString() })
    .eq("id", cfg.id);

  const result = {
    period: { from: dataInicial, to: dataFinal, mode: fullHistory ? 'complete' : 'incremental' },
    found: list.length,
    imported: imported.length,
    updated: updated.length,
    skipped: skipped.length,
    errors: errors.length,
    error_details: errors.slice(0, 20),
  };
  await logSync({ entity_type: "order", action: "pull", status: errors.length ? "error" : "success", response: result, error_message: errors.length ? `${errors.length} pedido(s) com erro` : null });
  return result;
}

// Order flows between the store and Bling.
import { blingError, callBling, getConfig, getSupabaseAdmin, logSync } from "./bling.ts";

const onlyDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

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
  "12": "shipped",
  "15": "shipped",
  "24": "paid",
};

/** Import marketplace orders that Bling received (Mercado Livre, Shopee, Magalu, Amazon, TikTok...). */
export async function pullMarketplaceOrders(sinceIso?: string) {
  const supa = getSupabaseAdmin();
  const cfg = await getConfig();
  if (!cfg?.is_active || !cfg.pull_marketplace_orders) {
    return { skipped: true, reason: "importação de pedidos desligada" };
  }

  const since = sinceIso ?? cfg.last_order_pull_at ??
    new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const dataInicial = since.slice(0, 10);

  const { status, data } = await callBling({
    path: "/pedidos/vendas",
    query: { dataAlteracaoInicial: `${dataInicial} 00:00:00`, limite: 100 },
    config: cfg,
  });
  if (status >= 400) throw new Error(blingError(status, data));

  const list = data?.data ?? [];
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const summary of list) {
    const blingId = String(summary.id);
    const { data: link } = await supa
      .from("bling_order_links")
      .select("id, order_id")
      .eq("bling_order_id", blingId)
      .maybeSingle();
    if (link) {
      skipped.push(blingId);
      continue;
    }

    const detail = await callBling({ path: `/pedidos/vendas/${blingId}`, config: cfg });
    if (detail.status >= 400) continue;
    const o = detail.data?.data ?? {};

    const channelName = o?.loja?.nome ?? o?.loja?.descricao ?? (o?.loja?.id ? `canal ${o.loja.id}` : "bling");
    const items = o?.itens ?? [];
    const subtotal = items.reduce((s: number, i: any) => s + Number(i.valor ?? 0) * Number(i.quantidade ?? 1), 0);
    const shipping = Number(o?.transporte?.frete ?? 0);
    const total = Number(o?.total ?? subtotal + shipping);

    const { data: orderNumber } = await supa.rpc("generate_order_number");

    const { data: created, error: createErr } = await supa
      .from("orders")
      .insert({
        order_number: orderNumber,
        status: STATUS_MAP[String(o?.situacao?.id ?? "")] ?? "pending",
        subtotal,
        shipping_cost: shipping,
        total,
        source: `bling:${String(channelName).toLowerCase()}`,
        guest_info: {
          name: o?.contato?.nome ?? null,
          cpf: o?.contato?.numeroDocumento ?? null,
          email: o?.contato?.email ?? null,
          phone: o?.contato?.telefone ?? null,
          marketplace: channelName,
          bling_order_number: o?.numero ?? null,
        },
        shipping_address: o?.transporte?.etiqueta
          ? {
            recipient_name: o.transporte.etiqueta.nome ?? null,
            street: o.transporte.etiqueta.endereco ?? null,
            number: o.transporte.etiqueta.numero ?? null,
            complement: o.transporte.etiqueta.complemento ?? null,
            neighborhood: o.transporte.etiqueta.bairro ?? null,
            city: o.transporte.etiqueta.municipio ?? null,
            state: o.transporte.etiqueta.uf ?? null,
            zip_code: o.transporte.etiqueta.cep ?? null,
          }
          : null,
      })
      .select("id")
      .single();
    if (createErr) {
      await logSync({ entity_type: "order", entity_id: blingId, action: "pull", status: "error", error_message: createErr.message });
      continue;
    }

    if (items.length) {
      await supa.from("order_items").insert(
        items.map((i: any) => ({
          order_id: created.id,
          shopify_product_id: String(i?.produto?.id ?? i?.codigo ?? "bling"),
          shopify_variant_id: String(i?.codigo ?? i?.produto?.codigo ?? "bling"),
          product_title: i?.descricao ?? "Item",
          quantity: Number(i?.quantidade ?? 1),
          unit_price: Number(i?.valor ?? 0),
          total_price: Number(i?.valor ?? 0) * Number(i?.quantidade ?? 1),
        })),
      );
    }

    await supa.from("bling_order_links").insert({
      order_id: created.id,
      bling_order_id: blingId,
      bling_order_number: String(o?.numero ?? ""),
      channel: String(channelName),
      direction: "pull",
      bling_status: String(o?.situacao?.id ?? ""),
      raw_payload: o,
      last_synced_at: new Date().toISOString(),
    });

    imported.push(blingId);
  }

  await supa.from("bling_config")
    .update({ last_order_pull_at: new Date().toISOString(), last_sync_at: new Date().toISOString() })
    .eq("id", cfg.id);

  await logSync({ entity_type: "order", action: "pull", status: "success", response: { imported: imported.length, skipped: skipped.length } });
  return { imported: imported.length, skipped: skipped.length };
}

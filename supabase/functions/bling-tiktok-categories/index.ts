import {
  assertAdmin,
  blingError,
  callBling,
  corsHeaders,
  getSupabaseAdmin,
  jsonResponse,
} from "../_shared/bling.ts";

type Channel = {
  id: string | number;
  descricao?: string;
  nome?: string;
  tipo?: string;
  tipoIntegracao?: string;
  situacao?: number;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  is_leaf: boolean;
  required_attributes: unknown[];
};

function isTikTok(channel: Channel) {
  return /tiktok/i.test(`${channel.tipo ?? ""} ${channel.tipoIntegracao ?? ""} ${channel.descricao ?? ""}`);
}

function normalizeCategories(input: unknown): Category[] {
  const result: Category[] = [];
  const visit = (value: unknown, parentId: string | null = null) => {
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    const rawId = item.id ?? item.codigo ?? item.category_id ?? item.categoryId;
    const children = [item.filhos, item.children, item.categorias, item.subcategorias]
      .find(Array.isArray) as unknown[] | undefined;
    const name = item.descricao ?? item.nome ?? item.name ?? item.local_name;
    if (rawId != null && typeof name === "string") {
      const attributes = [item.atributos, item.attributes, item.required_attributes]
        .find(Array.isArray) as unknown[] | undefined;
      result.push({
        id: String(rawId),
        name,
        parent_id: parentId,
        is_leaf: item.is_leaf === true || item.folha === true || !children?.length,
        required_attributes: attributes ?? [],
      });
      parentId = String(rawId);
    }
    for (const child of children ?? []) visit(child, parentId);
  };
  for (const item of Array.isArray(input) ? input : []) visit(item);
  return result.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

async function getTikTokChannel() {
  const response = await callBling({ path: "/canais-venda", query: { limite: 100 } });
  if (response.status >= 400) throw new Error(blingError(response.status, response.data));
  return ((response.data?.data ?? []) as Channel[]).find((item) => isTikTok(item) && item.situacao !== 0) ?? null;
}

async function getCategories(channel: Channel) {
  const storeId = String(channel.id);
  const integrationType = channel.tipoIntegracao ?? channel.tipo ?? "TikTok";
  const announcementCategories = await callBling({
    path: "/anuncios/categorias",
    query: { tipoIntegracao: integrationType, idLoja: storeId },
  });
  if (announcementCategories.status < 400) {
    return normalizeCategories(announcementCategories.data?.data ?? announcementCategories.data);
  }

  const linkedCategories = await callBling({
    path: "/categorias/lojas",
    query: { idLoja: storeId, limite: 100 },
  });
  if (linkedCategories.status >= 400) {
    throw new Error(blingError(announcementCategories.status, announcementCategories.data));
  }
  return normalizeCategories(linkedCategories.data?.data ?? []);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const actorId = await assertAdmin(req);
    const channel = await getTikTokChannel();
    if (!channel) return jsonResponse({ error: "A loja TikTok Shop não está ativa no Bling." }, 409);

    const supa = getSupabaseAdmin();
    const { data: savedChannel, error: channelError } = await supa
      .from("marketplace_channels")
      .upsert({
        provider: "tiktok",
        external_store_id: String(channel.id),
        name: channel.descricao ?? channel.nome ?? "TikTok Shop",
        is_connected: true,
        raw_data: channel,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "provider,external_store_id" })
      .select("id")
      .single();
    if (channelError || !savedChannel) throw channelError ?? new Error("Não foi possível registrar o canal TikTok.");

    if (req.method === "GET") {
      const categories = await getCategories(channel);
      return jsonResponse({ categories, channel: { id: String(channel.id), name: channel.descricao ?? channel.nome ?? "TikTok Shop" } });
    }
    if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

    const body = await req.json().catch(() => ({}));
    if (body.action === "list") {
      const categories = await getCategories(channel);
      return jsonResponse({ categories, channel: { id: String(channel.id), name: channel.descricao ?? channel.nome ?? "TikTok Shop" } });
    }
    const productId = typeof body.product_id === "string" ? body.product_id : "";
    if (body.action === "confirm_product") {
      if (!/^[0-9a-f-]{36}$/i.test(productId)) return jsonResponse({ error: "Produto inválido." }, 400);
      const confirmedAt = new Date().toISOString();
      const { data: product, error: productLookupError } = await supa
        .from("products")
        .select("id,title,product_type,vendor,manufacturer,description,price,ncm,cest,fiscal_origin,marketplace_attributes")
        .eq("id", productId)
        .maybeSingle();
      if (productLookupError) throw productLookupError;
      if (!product) return jsonResponse({ error: "Produto não encontrado." }, 404);
      const { error: confirmationError } = await supa.from("products").update({ suggestions_confirmed_at: confirmedAt }).eq("id", productId);
      if (confirmationError) throw confirmationError;
      await supa.from("marketplace_product_events").insert({
        product_id: productId,
        channel_id: savedChannel.id,
        actor_id: actorId,
        event_type: "data_confirmed",
        status: "success",
        details: { confirmed_at: confirmedAt, source: "admin_review", reviewed_fields: ["title", "description", "vendor", "manufacturer", "price", "product_type", "ncm", "cest", "fiscal_origin"] },
      });
      return jsonResponse({ ok: true, product, confirmed_at: confirmedAt });
    }
    const categoryId = typeof body.category_id === "string" ? body.category_id.trim() : "";
    const categoryName = typeof body.category_name === "string" ? body.category_name.trim() : "";
    const attributes = body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes)
      ? body.attributes as Record<string, string>
      : {};
    if (!/^[0-9a-f-]{36}$/i.test(productId) || !categoryId || !categoryName) {
      return jsonResponse({ error: "Produto e categoria são obrigatórios." }, 400);
    }

    const [{ data: product }, categories] = await Promise.all([
      supa.from("products").select("id,product_type").eq("id", productId).maybeSingle(),
      getCategories(channel),
    ]);
    if (!product?.product_type) return jsonResponse({ error: "Defina o tipo do produto antes da categoria TikTok." }, 409);
    const selected = categories.find((category) => category.id === categoryId);
    if (!selected) return jsonResponse({ error: "Escolha uma categoria real retornada pelo canal TikTok." }, 400);

    const requiredAttributes = selected.required_attributes;
    const requiredIds = requiredAttributes
      .filter((attribute) => attribute && typeof attribute === "object" && ((attribute as Record<string, unknown>).required === true || (attribute as Record<string, unknown>).obrigatorio === true))
      .map((attribute) => String((attribute as Record<string, unknown>).id ?? (attribute as Record<string, unknown>).codigo ?? ""))
      .filter(Boolean);
    const missingAttributes = requiredIds.filter((id) => !String(attributes[id] ?? "").trim());
    if (missingAttributes.length) return jsonResponse({ error: "Preencha os atributos obrigatórios da categoria.", missing_attributes: missingAttributes }, 409);

    const { error: mappingError } = await supa.from("marketplace_category_mappings").upsert({
      channel_id: savedChannel.id,
      local_category_id: null,
      local_category_value: product.product_type,
      marketplace_category_id: selected.id,
      marketplace_category_name: selected.name,
      required_attributes: requiredAttributes,
      attribute_mappings: attributes,
      confirmed_at: new Date().toISOString(),
      confirmed_by: actorId,
    }, { onConflict: "channel_id,local_category_value" });
    if (mappingError) throw mappingError;

    const { error: productError } = await supa.from("products").update({
      marketplace_attributes: attributes,
      suggestions_confirmed_at: new Date().toISOString(),
    }).eq("id", productId);
    if (productError) throw productError;

    await supa.from("marketplace_product_events").insert({
      product_id: productId,
      channel_id: savedChannel.id,
      actor_id: actorId,
      event_type: "category_confirmed",
      status: "success",
      details: { category_id: selected.id, category_name: selected.name },
    });
    return jsonResponse({ ok: true, category: selected });
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
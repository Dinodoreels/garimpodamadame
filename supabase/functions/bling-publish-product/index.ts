import {
  assertAdmin,
  blingError,
  callBling,
  corsHeaders,
  getSupabaseAdmin,
  jsonResponse,
  logSync,
} from "../_shared/bling.ts";

type Channel = {
  id: string;
  descricao?: string;
  nome?: string;
  tipo?: string;
  tipoIntegracao?: string;
  situacao?: number;
};

function channelType(channel: Channel) {
  return channel.tipoIntegracao ?? channel.tipo ?? "TikTok";
}

function isTikTok(channel: Channel) {
  return /tiktok/i.test(`${channel.tipo ?? ""} ${channel.tipoIntegracao ?? ""} ${channel.descricao ?? ""}`);
}

function errorResponse(message: string, status: number, details?: unknown) {
  return new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveActor(req: Request) {
  const internalToken = Deno.env.get("BLING_CRON_TOKEN");
  if (internalToken && req.headers.get("authorization") === `Bearer ${internalToken}`) {
    const { data } = await getSupabaseAdmin().from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
    return data?.user_id ?? null;
  }
  return await assertAdmin(req);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const actorId = await resolveActor(req);
    const body = await req.json().catch(() => ({}));
    const productId = typeof body.product_id === "string" ? body.product_id : "";
    const automatic = body.automatic === true;
    const letBlingChooseCategory = body.let_bling_choose_category === true || automatic;
    if (!/^[0-9a-f-]{36}$/i.test(productId)) return errorResponse("Produto inválido.", 400);

    const supa = getSupabaseAdmin();
    const [{ data: product, error: productError }, channelsResult] = await Promise.all([
      supa
        .from("products")
        .select("id,title,description,product_type,vendor,price,weight_grams,width_cm,height_cm,length_cm,ncm,fiscal_origin,suggestions_confirmed_at,catalog_pending_fields,marketplace_attributes,product_images(url,position),product_variants(id,sku,price,inventory_quantity),bling_product_links(bling_product_id)")
        .eq("id", productId)
        .single(),
      callBling({ path: "/canais-venda", query: { limite: 100 } }),
    ]);
    if (productError || !product) return errorResponse("Produto não encontrado.", 404);
    if (channelsResult.status >= 400) return errorResponse(blingError(channelsResult.status, channelsResult.data), channelsResult.status);

    const channel = ((channelsResult.data?.data ?? []) as Channel[]).find((item) => isTikTok(item) && item.situacao !== 0);
    if (!channel) return errorResponse("A loja TikTok Shop não está ativa no Bling.", 409);

    const type = channelType(channel);
    const storeId = String(channel.id);
    const { data: savedChannel, error: channelError } = await supa
      .from("marketplace_channels")
      .upsert({
        provider: "tiktok",
        external_store_id: storeId,
        name: channel.descricao ?? channel.nome ?? "TikTok Shop",
        is_connected: true,
        raw_data: channel,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "provider,external_store_id" })
      .select("id")
      .single();
    if (channelError || !savedChannel) throw channelError ?? new Error("Não foi possível registrar o canal TikTok.");

    const upsertPublication = async (values: Record<string, unknown>) => {
      const { data: current } = await supa
        .from("marketplace_product_publications")
        .select("id")
        .eq("product_id", productId)
        .eq("channel_id", savedChannel.id)
        .is("variant_id", null)
        .maybeSingle();
      const record = { ...values, updated_at: new Date().toISOString() };
      const result = current?.id
        ? await supa.from("marketplace_product_publications").update(record).eq("id", current.id)
        : await supa.from("marketplace_product_publications").insert({ product_id: productId, channel_id: savedChannel.id, variant_id: null, ...record });
      const { error } = result;
      if (error) throw error;
    };

    const blingProductId = product.bling_product_links?.[0]?.bling_product_id;
    if (!blingProductId) {
      await upsertPublication({ status: "pending", pending_fields: ["bling_link"], last_error: "Produto ainda não está vinculado ao Bling." });
      return errorResponse("Produto ainda não está vinculado ao Bling.", 409);
    }

    const storeLinkResult = await callBling({
      path: "/produtos/lojas",
      query: { idLoja: storeId, idProduto: blingProductId, limite: 100 },
    });
    const existingStoreLink = storeLinkResult.status < 400
      ? (storeLinkResult.data?.data ?? []).find((item: { produto?: { id?: number }; loja?: { id?: number } }) =>
        String(item.produto?.id ?? "") === String(blingProductId) && String(item.loja?.id ?? "") === storeId)
      : null;

    const listingResult = await callBling({
      path: "/anuncios",
      query: { tipoIntegracao: type, idLoja: storeId, idProduto: blingProductId, limite: 100 },
    });
    if (listingResult.status >= 400) {
      const message = blingError(listingResult.status, listingResult.data);
      await upsertPublication({ status: "error", last_error: message, last_response: listingResult.data, last_attempt_at: new Date().toISOString() });
      return errorResponse(message, listingResult.status, listingResult.data);
    }

    const existing = listingResult.data?.data?.[0];
    if (existing?.id) {
      const status = Number(existing.situacao ?? existing.status);
      const localStatus = status === 1 ? "published" : status === 3 ? "error" : status === 4 ? "paused" : "pending";
      await upsertPublication({
        external_listing_id: String(existing.id),
        status: localStatus,
        pending_fields: [],
        last_error: status === 3 ? "O TikTok marcou o anúncio com problema. Revise-o no Bling." : null,
        last_response: existing,
        last_attempt_at: new Date().toISOString(),
        published_at: status === 1 ? new Date().toISOString() : null,
      });
      return jsonResponse({ ok: status === 1, status: localStatus, listing: existing, channel: { id: storeId, name: channel.descricao, type } });
    }

    const { data: mapping } = await supa
      .from("marketplace_category_mappings")
      .select("marketplace_category_id,required_attributes,confirmed_at")
      .eq("channel_id", savedChannel.id)
      .eq("local_category_value", product.product_type ?? "")
      .maybeSingle();
    const missing = new Set<string>(product.catalog_pending_fields ?? []);
    if (!String(product.title ?? "").trim()) missing.add("title");
    if (!String(product.description ?? "").trim()) missing.add("description");
    if (!String(product.product_type ?? "").trim()) missing.add("category");
    if (!String(product.vendor ?? "").trim()) missing.add("brand");
    if (!(Number(product.price) > 0)) missing.add("price");
    if (!(product.product_images ?? []).length) missing.add("images");
    if (!(Number(product.weight_grams) > 0)) missing.add("weight");
    if (!(Number(product.width_cm) > 0 && Number(product.height_cm) > 0 && Number(product.length_cm) > 0)) missing.add("dimensions");
    if (!String(product.ncm ?? "").trim()) missing.add("ncm");
    if (product.fiscal_origin == null) missing.add("fiscal_origin");
    const validVariants = (product.product_variants ?? []).filter((variant: { sku?: string; price?: number; inventory_quantity?: number }) => String(variant.sku ?? "").trim() && Number(variant.price) > 0);
    if (!validVariants.length) missing.add("sku");
    if (!validVariants.some((variant: { inventory_quantity?: number }) => Number(variant.inventory_quantity) > 0)) missing.add("stock");
    if (!product.suggestions_confirmed_at) missing.add("confirmation");
    if (!letBlingChooseCategory && (!mapping?.confirmed_at || !mapping.marketplace_category_id)) missing.add("tiktok_category");
    const requiredIds = (mapping?.required_attributes ?? [])
      .filter((attribute: Record<string, unknown>) => attribute.required === true || attribute.obrigatorio === true)
      .map((attribute: Record<string, unknown>) => String(attribute.id ?? attribute.codigo ?? ""))
      .filter(Boolean);
    for (const requiredId of requiredIds) {
      if (!String((product.marketplace_attributes as Record<string, unknown> | null)?.[requiredId] ?? "").trim()) missing.add(`attribute:${requiredId}`);
    }

    if (missing.size) {
      const pendingFields = [...missing];
      const message = pendingFields.includes("confirmation")
        ? "Confirme os dados sugeridos do produto antes de publicar."
        : pendingFields.includes("tiktok_category")
          ? "Selecione e confirme a categoria real do TikTok antes de publicar."
          : "Complete os dados obrigatórios antes de publicar no TikTok.";
      await upsertPublication({ status: "pending", pending_fields: pendingFields, last_error: message, last_attempt_at: new Date().toISOString() });
      await supa.from("marketplace_product_events").insert({ product_id: productId, channel_id: savedChannel.id, actor_id: actorId, event_type: "publish_blocked", status: "pending", details: { pending_fields: pendingFields, message } });
      return errorResponse(message, 409, { pending_fields: pendingFields, channel: { id: storeId, name: channel.descricao, type } });
    }
    const marketplaceCategoryId = mapping?.marketplace_category_id;
    if (!letBlingChooseCategory && !marketplaceCategoryId) return errorResponse("Selecione a categoria real do TikTok antes de publicar.", 409);

    const productDetailResult = automatic
      ? await callBling({ path: `/produtos/${blingProductId}` })
      : null;
    const blingCategoryId = String(
      (product.marketplace_attributes as Record<string, unknown> | null)?.bling_category_id ??
      productDetailResult?.data?.data?.categoria?.id ??
      "",
    ).trim();
    if (automatic && !blingCategoryId) {
      const message = "Vincule uma categoria do Bling ao produto antes da publicação automática.";
      await upsertPublication({ status: "pending", pending_fields: ["bling_category"], last_error: message, last_attempt_at: new Date().toISOString() });
      return errorResponse(message, 409);
    }

    if (automatic && !existingStoreLink) {
      const primaryVariant = validVariants[0];
      const storeLinkPayload = {
        codigo: "0",
        preco: Number(product.price),
        precoPromocional: 0,
        produto: { id: Number(blingProductId) },
        loja: { id: Number(storeId) },
        ...(blingCategoryId ? { categoriasProdutos: [{ id: Number(blingCategoryId) }] } : {}),
      };
      const linkResult = await callBling({ path: "/produtos/lojas", method: "POST", body: storeLinkPayload });
      if (linkResult.status >= 400) {
        const message = blingError(linkResult.status, linkResult.data);
        await upsertPublication({ status: "error", last_error: message, last_payload: storeLinkPayload, last_response: linkResult.data, last_attempt_at: new Date().toISOString() });
        await logSync({ entity_type: "product", entity_id: productId, action: "link_tiktok_via_bling", status: "error", payload: storeLinkPayload, response: linkResult.data, error_message: message });
        return errorResponse(message, linkResult.status, linkResult.data);
      }
      await upsertPublication({
        status: "pending",
        pending_fields: [],
        last_error: null,
        last_payload: storeLinkPayload,
        last_response: linkResult.data,
        last_attempt_at: new Date().toISOString(),
      });
      await supa.from("marketplace_product_events").insert({ product_id: productId, channel_id: savedChannel.id, actor_id: actorId, event_type: "submitted", status: "pending", details: { via: "bling_store_link", sku: primaryVariant?.sku } });
      await logSync({ entity_type: "product", entity_id: productId, action: "link_tiktok_via_bling", status: "success", payload: storeLinkPayload, response: linkResult.data });
      return jsonResponse({ ok: true, status: "pending", channel: { id: storeId, name: channel.descricao ?? channel.nome ?? "TikTok Shop", type }, bling_response: linkResult.data });
    }

    if (automatic && existingStoreLink) {
      await upsertPublication({
        external_listing_id: String(existingStoreLink.codigo ?? existingStoreLink.id ?? "") || null,
        status: "pending",
        pending_fields: [],
        last_error: null,
        last_response: existingStoreLink,
        last_attempt_at: new Date().toISOString(),
      });
      return jsonResponse({
        ok: true,
        status: "pending",
        channel: { id: storeId, name: channel.descricao ?? channel.nome ?? "TikTok Shop", type },
        bling_response: existingStoreLink,
      });
    }

    const attributes = product.marketplace_attributes && typeof product.marketplace_attributes === "object"
      ? Object.entries(product.marketplace_attributes).map(([id, valor]) => ({ id, valor: String(valor) }))
      : [];
    const images = (product.product_images ?? [])
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((image: { url: string }, order: number) => ({ url: image.url, ordem: order + 1 }));
    const payload = {
      produto: { id: Number(blingProductId) },
      integracao: { tipo: type },
      loja: { id: Number(storeId) },
      nome: product.title,
      descricao: product.description ?? product.title,
      preco: { valor: Number(product.price) },
      estoques: { itens: [14889184090] },
      ...(marketplaceCategoryId ? { categoria: { id: marketplaceCategoryId } } : {}),
      atributos: attributes,
      imagens: images,
    };
    const createResult = await callBling({ path: "/anuncios", method: "POST", body: payload });
    if (createResult.status >= 400) {
      const message = blingError(createResult.status, createResult.data);
      await upsertPublication({ status: "error", last_error: message, last_payload: payload, last_response: createResult.data, last_attempt_at: new Date().toISOString() });
      await logSync({ entity_type: "product", entity_id: productId, action: "publish_tiktok_via_bling", status: "error", payload, response: createResult.data, error_message: message });
      return errorResponse(message, createResult.status, createResult.data);
    }

    const listingId = String(createResult.data?.data?.id ?? "");
    if (!listingId) return errorResponse("O Bling não retornou o código do anúncio.", 502, createResult.data);
    const publishResult = await callBling({ path: `/anuncios/${listingId}/publicar`, method: "POST", query: { tipoIntegracao: type, idLoja: storeId } });
    if (publishResult.status >= 400) {
      const message = blingError(publishResult.status, publishResult.data);
      await upsertPublication({ external_listing_id: listingId, status: "error", last_error: message, last_payload: payload, last_response: publishResult.data, last_attempt_at: new Date().toISOString() });
      return errorResponse(message, publishResult.status, publishResult.data);
    }

    await upsertPublication({ external_listing_id: listingId, status: "published", pending_fields: [], last_error: null, last_payload: payload, last_response: publishResult.data, last_attempt_at: new Date().toISOString(), published_at: new Date().toISOString() });
    await supa.from("marketplace_product_events").insert({ product_id: productId, channel_id: savedChannel.id, actor_id: actorId, event_type: "published", status: "success", details: { listing_id: listingId, via: "bling" } });
    await logSync({ entity_type: "product", entity_id: productId, action: "publish_tiktok_via_bling", status: "success", payload, response: publishResult.data });
    return jsonResponse({
      ok: true,
      status: "published",
      listing_id: listingId,
      channel: { id: storeId, name: channel.descricao ?? channel.nome ?? "TikTok Shop", type },
      tiktok_response: publishResult.data,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : JSON.stringify(error);
    return errorResponse(message, 500, error);
  }
});
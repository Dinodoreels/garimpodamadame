import {
  assertAdmin,
  corsHeaders,
  getSupabaseAdmin,
  jsonResponse,
  logSync,
} from "../_shared/bling.ts";
import { getTikTokCategories, getTikTokCategoryAttributes, getTikTokChannel } from "../_shared/bling-tiktok.ts";

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
      const productType = new URL(req.url).searchParams.get("product_type") ?? undefined;
      try {
        const categories = await getTikTokCategories(channel, productType);
        return jsonResponse({ categories, channel: { id: String(channel.id), name: channel.descricao ?? channel.nome ?? "TikTok Shop" } });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return jsonResponse({
          categories: [],
          availability: "blocked_by_bling",
          message: "A loja TikTok está conectada, mas o Bling não liberou as categorias de anúncios para esta conexão. No Bling, abra a integração TikTok Shop, habilite o gerenciamento de produtos/anúncios e reconecte o aplicativo.",
          detail,
          channel: { id: String(channel.id), name: channel.descricao ?? channel.nome ?? "TikTok Shop" },
        });
      }
    }
    if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

    const body = await req.json().catch(() => ({}));
    const productId = typeof body.product_id === "string" ? body.product_id : "";
    if (body.action === "product_status") {
      if (!/^[0-9a-f-]{36}$/i.test(productId)) return jsonResponse({ error: "Produto inválido." }, 400);
      const [{ data: publication }, { data: mapping }, { data: events }] = await Promise.all([
        supa.from("marketplace_product_publications")
          .select("status,external_listing_id,pending_fields,last_error,last_payload,last_response,last_attempt_at,published_at,updated_at")
          .eq("product_id", productId).eq("channel_id", savedChannel.id).is("variant_id", null).maybeSingle(),
        supa.from("marketplace_category_mappings")
          .select("marketplace_category_id,marketplace_category_name,required_attributes,attribute_mappings,confirmed_at")
          .eq("channel_id", savedChannel.id).maybeSingle(),
        supa.from("marketplace_product_events")
          .select("event_type,status,details,created_at").eq("product_id", productId).eq("channel_id", savedChannel.id)
          .order("created_at", { ascending: false }).limit(20),
      ]);
      return jsonResponse({
        channel: { id: String(channel.id), name: channel.descricao ?? channel.nome ?? "TikTok Shop", raw: channel },
        category: mapping ?? null,
        publication: publication ?? null,
        events: events ?? [],
      });
    }
    if (body.action === "list") {
      const productType = typeof body.product_type === "string" ? body.product_type : undefined;
      try {
        const categories = await getTikTokCategories(channel, productType);
        return jsonResponse({ categories, channel: { id: String(channel.id), name: channel.descricao ?? channel.nome ?? "TikTok Shop" } });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return jsonResponse({
          categories: [],
          availability: "blocked_by_bling",
          message: "A loja TikTok está conectada, mas o Bling não liberou as categorias de anúncios para esta conexão. No Bling, abra a integração TikTok Shop, habilite o gerenciamento de produtos/anúncios e reconecte o aplicativo.",
          detail,
          channel: { id: String(channel.id), name: channel.descricao ?? channel.nome ?? "TikTok Shop" },
        });
      }
    }
    if (body.action === "confirm_product") {
      if (!/^[0-9a-f-]{36}$/i.test(productId)) return jsonResponse({ error: "Produto inválido." }, 400);
      const confirmedAt = new Date().toISOString();
      const { data: product, error: productLookupError } = await supa
        .from("products")
        .select("id,title,product_type,vendor,manufacturer,description,price,ncm,cest,fiscal_origin,marketplace_attributes,catalog_pending_fields")
        .eq("id", productId)
        .maybeSingle();
      if (productLookupError) throw productLookupError;
      if (!product) return jsonResponse({ error: "Produto não encontrado." }, 404);
      const remainingPendingFields = Array.isArray(product.catalog_pending_fields)
        ? product.catalog_pending_fields.filter((field: unknown) => field !== "confirmation")
        : [];
      const { error: confirmationError } = await supa.from("products").update({
        suggestions_confirmed_at: confirmedAt,
        catalog_pending_fields: remainingPendingFields,
      }).eq("id", productId);
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
      getTikTokCategories(channel, typeof body.product_type === "string" ? body.product_type : undefined),
    ]);
    if (!product?.product_type) return jsonResponse({ error: "Defina o tipo do produto antes da categoria TikTok." }, 409);
    const selected = categories.find((category) => category.id === categoryId);
    if (!selected) return jsonResponse({ error: "Escolha uma categoria real retornada pelo canal TikTok." }, 400);

    let requiredAttributes = selected.required_attributes;
    if (!requiredAttributes.length) {
      try {
        requiredAttributes = await getTikTokCategoryAttributes(channel, selected.id);
      } catch (attributeError) {
        const detail = attributeError instanceof Error ? attributeError.message : String(attributeError);
        await logSync({
          entity_type: "category",
          entity_id: selected.id,
          action: "tiktok_attributes",
          status: "blocked",
          payload: { product_id: productId, category_id: selected.id, store_id: String(channel.id) },
          error_message: detail,
        });
        return jsonResponse({
          ok: false,
          blocked: true,
          error: "O Bling não liberou os atributos desta categoria. A categoria foi mantida, mas o produto não será publicado até o Bling devolver os campos obrigatórios.",
          detail,
        });
      }
    }
    const requiredIds = requiredAttributes
      .filter((attribute) => attribute && typeof attribute === "object" && ((attribute as Record<string, unknown>).required === true || (attribute as Record<string, unknown>).obrigatorio === true))
      .map((attribute) => String((attribute as Record<string, unknown>).id ?? (attribute as Record<string, unknown>).codigo ?? ""))
      .filter(Boolean);
    const missingAttributes = requiredIds.filter((id) => !String(attributes[id] ?? "").trim());
    if (missingAttributes.length) {
      return jsonResponse({
        ok: false,
        blocked: true,
        error: "Preencha os atributos obrigatórios da categoria.",
        missing_attributes: missingAttributes,
      });
    }

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
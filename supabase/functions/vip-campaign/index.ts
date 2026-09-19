import { z } from "npm:zod@3.23.8";
import { assertAdmin, corsHeaders, getSupabaseAdmin, jsonResponse } from "../_shared/bling.ts";

const RequestSchema = z.object({
  variant_id: z.string().uuid(),
  discount_percent: z.number().positive().max(90),
  send: z.boolean().default(false),
});

const money = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value);

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? "");

async function sendToGroup(provider: string, groupId: string, message: string, whatsapp: Record<string, any>) {
  if (provider === "evolution") {
    const cfg = whatsapp.evolution ?? {};
    const response = await fetch(`${String(cfg.base_url ?? "").replace(/\/$/, "")}/message/sendText/${cfg.instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.api_key ?? "" },
      body: JSON.stringify({ number: groupId, text: message }),
    });
    return response;
  }
  if (provider === "wppconnect") {
    const cfg = whatsapp.wppconnect ?? {};
    return await fetch(`${String(cfg.base_url ?? "").replace(/\/$/, "")}/api/${cfg.session}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.secret_key ?? ""}` },
      body: JSON.stringify({ phone: groupId, message }),
    });
  }
  if (provider === "uazapi") {
    const cfg = whatsapp.uazapi ?? {};
    return await fetch(`${String(cfg.base_url ?? "https://free.uazapi.com").replace(/\/$/, "")}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: cfg.instance_token ?? "" },
      body: JSON.stringify({ number: groupId, text: message }),
    });
  }
  throw new Error("Escolha Evolution API, WPPConnect ou UAZAPI para enviar ao grupo VIP.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const actorId = await assertAdmin(req);
    const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonResponse({ error: "Produto ou desconto inválido." }, 400);

    const db = getSupabaseAdmin();
    const { variant_id: variantId, discount_percent: discountPercent, send } = parsed.data;
    const { data: variant, error: variantError } = await db
      .from("product_variants")
      .select("id, product_id, sku, price, inventory_quantity, is_available, products!inner(id,title,handle,status,is_available,product_images(url,position))")
      .eq("id", variantId)
      .single();
    if (variantError || !variant) return jsonResponse({ error: "Produto não encontrado." }, 404);

    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
    const images = [...(product?.product_images ?? [])].sort((a, b) => a.position - b.position);
    const stock = Math.max(0, Number(variant.inventory_quantity ?? 0));
    const price = Number(variant.price ?? 0);
    if (!variant.sku || !product?.handle || !images[0]?.url || price <= 0 || stock <= 0 || product.status !== "active" || !product.is_available || !variant.is_available) {
      return jsonResponse({ error: "O produto precisa estar ativo e ter SKU, foto, preço e estoque disponível." }, 409);
    }

    const [{ data: vipConfig }, { data: settingsRow }] = await Promise.all([
      db.from("vip_sales_config").select("*").limit(1).maybeSingle(),
      db.from("site_settings").select("value").eq("key", "integrations").maybeSingle(),
    ]);
    const template = vipConfig?.message_template ?? "✨ OFERTA VIP ✨\n\n{{produto}}\nDe {{preco_original}} por {{preco_vip}}\nEstoque: {{estoque}} unidade(s)\nCupom: {{cupom}}\n\nCompre aqui: {{link}}";
    const couponCode = `${String(vipConfig?.coupon_prefix ?? "VIP").replace(/[^A-Z0-9]/gi, "").toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + Number(vipConfig?.coupon_expires_days ?? 7) * 86_400_000).toISOString();
    const link = `https://ogarimpodigital.com.br/produto/${product.handle}?cupom=${encodeURIComponent(couponCode)}&utm_source=whatsapp&utm_medium=grupo_vip`;
    const vipPrice = price * (1 - discountPercent / 100);
    const message = fill(template, {
      produto: product.title,
      preco_original: money(price),
      preco_vip: money(vipPrice),
      desconto: `${discountPercent}%`,
      estoque: String(stock),
      cupom: couponCode,
      link,
      foto: images[0].url,
    });

    if (!send) return jsonResponse({ preview: { message, coupon_code: couponCode, link, image_url: images[0].url, stock, price, vip_price: vipPrice } });
    if (!vipConfig?.is_active || !vipConfig.group_id || !vipConfig.provider) {
      return jsonResponse({ error: "Configure e ative o grupo VIP antes de enviar." }, 409);
    }

    const { data: coupon, error: couponError } = await db.from("discount_codes").insert({
      code: couponCode,
      type: "percentage",
      value: discountPercent,
      max_uses: null,
      uses_per_user: 1,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      is_active: true,
    }).select("id").single();
    if (couponError) throw couponError;

    const { data: campaign, error: campaignError } = await db.from("vip_product_campaigns").insert({
      product_id: product.id,
      variant_id: variant.id,
      discount_code_id: coupon.id,
      discount_percent: discountPercent,
      status: "ready",
      last_known_stock: stock,
      message_preview: message,
      created_by: actorId,
    }).select("id").single();
    if (campaignError) throw campaignError;

    const integrations = (settingsRow?.value ?? {}) as Record<string, any>;
    const response = await sendToGroup(vipConfig.provider, vipConfig.group_id, `${message}\n\n${images[0].url}`, integrations.whatsapp ?? {});
    const responseText = await response.text();
    if (!response.ok) {
      await db.from("vip_product_campaigns").update({ status: "failed", last_error: `WhatsApp ${response.status}` }).eq("id", campaign.id);
      await db.from("vip_campaign_events").insert({ campaign_id: campaign.id, event_type: "send_failed", stock_quantity: stock, error_message: responseText.slice(0, 1000) });
      return jsonResponse({ error: "O WhatsApp recusou o envio. Confira a conexão e o código do grupo." }, 502);
    }

    await db.from("vip_product_campaigns").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", campaign.id);
    await db.from("vip_campaign_events").insert({ campaign_id: campaign.id, event_type: "sent", stock_quantity: stock, payload: { provider: vipConfig.provider, coupon_code: couponCode } });
    return jsonResponse({ ok: true, campaign_id: campaign.id, coupon_code: couponCode });
  } catch (error) {
    if (error instanceof Response) return new Response(await error.text(), { status: error.status, headers: corsHeaders });
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
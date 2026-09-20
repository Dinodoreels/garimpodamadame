import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  preview: z.boolean().default(false),
});

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const money = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value);

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} não configurado.`);
  return value;
}

type DbClient = ReturnType<typeof createClient<any>>;

async function authorize(req: Request, db: DbClient, campaignId?: string) {
  const authorization = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && authorization === `Bearer ${serviceKey}`) return "system";
  if (!campaignId) throw new Response("Unauthorized", { status: 401 });

  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const userClient = createClient(requiredEnv("SUPABASE_URL"), anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await userClient.auth.getUser();
  if (!data.user) throw new Response("Unauthorized", { status: 401 });
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!role) throw new Response("Forbidden", { status: 403 });
  return data.user.id;
}

async function sendToGroup(provider: string, groupIdentifier: string, message: string, whatsapp: Record<string, unknown>) {
  if (provider === "evolution") {
    const cfg = (whatsapp.evolution ?? {}) as Record<string, string>;
    return fetch(`${String(cfg.base_url ?? "").replace(/\/$/, "")}/message/sendText/${cfg.instance ?? ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.api_key ?? "" },
      body: JSON.stringify({ number: groupIdentifier, text: message }),
    });
  }
  if (provider === "wppconnect") {
    const cfg = (whatsapp.wppconnect ?? {}) as Record<string, string>;
    return fetch(`${String(cfg.base_url ?? "").replace(/\/$/, "")}/api/${cfg.session ?? ""}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.secret_key ?? ""}` },
      body: JSON.stringify({ phone: groupIdentifier, message }),
    });
  }
  if (provider === "uazapi") {
    const cfg = (whatsapp.uazapi ?? {}) as Record<string, string>;
    return fetch(`${String(cfg.base_url ?? "https://free.uazapi.com").replace(/\/$/, "")}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: cfg.instance_token ?? "" },
      body: JSON.stringify({ number: groupIdentifier, text: message }),
    });
  }
  throw new Error("O provedor escolhido não permite disparos para grupos neste sistema.");
}

async function renderCampaign(db: DbClient, campaign: Record<string, any>) {
  const [{ data: productLinks }, { data: coupon }] = await Promise.all([
    db.from("whatsapp_campaign_products").select("products(id,title,handle,status,is_available,price,product_images(url,position),product_variants(price,inventory_quantity,is_available))").eq("campaign_id", campaign.id),
    campaign.discount_code_id
      ? db.from("discount_codes").select("code,is_active,starts_at,expires_at,max_uses,uses_count").eq("id", campaign.discount_code_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const now = Date.now();
  if (coupon && (!coupon.is_active || (coupon.starts_at && Date.parse(coupon.starts_at) > now) || (coupon.expires_at && Date.parse(coupon.expires_at) < now) || (coupon.max_uses && coupon.uses_count >= coupon.max_uses))) {
    throw new Error("O cupom selecionado está inativo, vencido ou esgotado.");
  }

  const productBlocks: string[] = [];
  for (const link of productLinks ?? []) {
    const product = Array.isArray(link.products) ? link.products[0] : link.products;
    if (!product || product.status !== "active" || !product.is_available) throw new Error("Um produto selecionado não está disponível.");
    const variants = product.product_variants ?? [];
    const stock = variants.reduce((total: number, variant: Record<string, unknown>) => total + (variant.is_available ? Math.max(0, Number(variant.inventory_quantity ?? 0)) : 0), 0);
    if (stock <= 0) throw new Error(`O produto ${product.title} está sem estoque.`);
    const prices = variants.filter((variant: Record<string, unknown>) => variant.is_available && Number(variant.inventory_quantity ?? 0) > 0).map((variant: Record<string, unknown>) => Number(variant.price ?? 0)).filter((price: number) => price > 0);
    const price = prices.length ? Math.min(...prices) : Number(product.price ?? 0);
    if (price <= 0) throw new Error(`O produto ${product.title} está sem preço válido.`);
    productBlocks.push(`• ${product.title} — ${money(price)}\nhttps://ogarimpodigital.com.br/produto/${product.handle}`);
  }

  const parts = [String(campaign.message_body ?? "").trim()];
  if (productBlocks.length) parts.push(productBlocks.join("\n\n"));
  if (coupon?.code) parts.push(`Cupom: ${coupon.code}`);
  if (campaign.link_url) parts.push(String(campaign.link_url));
  if (campaign.media_url) parts.push(String(campaign.media_url));
  return parts.filter(Boolean).join("\n\n");
}

async function processCampaign(db: DbClient, campaignId: string, preview: boolean) {
  const { data: campaign, error } = await db.from("whatsapp_campaigns").select("*").eq("id", campaignId).single();
  if (error || !campaign) throw new Error("Campanha não encontrada.");
  const message = await renderCampaign(db, campaign);
  if (preview) return { preview: { message, media_url: campaign.media_url, media_type: campaign.media_type } };
  if (["sent", "cancelled"].includes(campaign.status)) throw new Error("Esta campanha já foi concluída ou cancelada.");

  const [{ data: targets }, { data: settings }] = await Promise.all([
    db.from("whatsapp_campaign_targets").select("id,status,attempts,whatsapp_groups(id,name,group_identifier,provider,is_active)").eq("campaign_id", campaignId),
    db.from("site_settings").select("value").eq("key", "integrations").maybeSingle(),
  ]);
  if (!targets?.length) throw new Error("Selecione pelo menos um grupo ativo.");
  const integrations = (settings?.value ?? {}) as Record<string, unknown>;
  const whatsapp = (integrations.whatsapp ?? {}) as Record<string, unknown>;
  const activeProvider = String(whatsapp.active_provider ?? "");
  let sent = 0;
  let failed = 0;

  for (const target of targets) {
    if (["sent", "cancelled"].includes(target.status)) continue;
    const group = Array.isArray(target.whatsapp_groups) ? target.whatsapp_groups[0] : target.whatsapp_groups;
    if (!group?.is_active || group.provider !== activeProvider) {
      const reason = !group?.is_active ? "Grupo inativo." : "O provedor do grupo não é o provedor ativo do WhatsApp.";
      await db.from("whatsapp_campaign_targets").update({ status: "failed", attempts: target.attempts + 1, last_error: reason, rendered_message: message }).eq("id", target.id);
      await db.from("whatsapp_campaign_events").insert({ campaign_id: campaignId, target_id: target.id, event_type: "send_failed", error_message: reason });
      failed += 1;
      continue;
    }

    await db.from("whatsapp_campaign_targets").update({ status: "processing", attempts: target.attempts + 1, rendered_message: message }).eq("id", target.id);
    try {
      const response = await sendToGroup(group.provider, group.group_identifier, message, whatsapp);
      const responseText = await response.text();
      if (!response.ok) throw new Error(`WhatsApp ${response.status}: ${responseText.slice(0, 700)}`);
      let providerMessageId: string | null = null;
      try {
        const parsed = JSON.parse(responseText);
        providerMessageId = parsed?.key?.id ?? parsed?.id ?? parsed?.messageId ?? null;
      } catch { /* response without JSON */ }
      await db.from("whatsapp_campaign_targets").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null, provider_message_id: providerMessageId }).eq("id", target.id);
      await db.from("whatsapp_campaign_events").insert({ campaign_id: campaignId, target_id: target.id, event_type: "sent", payload: { provider: group.provider, provider_message_id: providerMessageId } });
      sent += 1;
    } catch (sendError) {
      const reason = sendError instanceof Error ? sendError.message : String(sendError);
      await db.from("whatsapp_campaign_targets").update({ status: "failed", last_error: reason }).eq("id", target.id);
      await db.from("whatsapp_campaign_events").insert({ campaign_id: campaignId, target_id: target.id, event_type: "send_failed", error_message: reason });
      failed += 1;
    }
  }

  const status = sent > 0 && failed > 0 ? "partial" : sent > 0 ? "sent" : "failed";
  await db.from("whatsapp_campaigns").update({ status, sent_at: sent > 0 ? new Date().toISOString() : null, processing_started_at: null, last_error: failed > 0 ? `${failed} grupo(s) falharam.` : null }).eq("id", campaignId);
  return { ok: sent > 0, campaign_id: campaignId, sent, failed, status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonResponse({ error: "Campanha inválida." }, 400);
    const db = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    await authorize(req, db, parsed.data.campaign_id);

    if (parsed.data.campaign_id) return jsonResponse(await processCampaign(db, parsed.data.campaign_id, parsed.data.preview));
    const results = [];
    for (let index = 0; index < 20; index += 1) {
      const { data: claimedId, error } = await db.rpc("claim_whatsapp_campaign", { p_campaign_id: null });
      if (error) throw error;
      if (!claimedId) break;
      try {
        results.push(await processCampaign(db, claimedId, false));
      } catch (campaignError) {
        const reason = campaignError instanceof Error ? campaignError.message : String(campaignError);
        await db.from("whatsapp_campaigns").update({ status: "failed", processing_started_at: null, last_error: reason }).eq("id", claimedId);
        results.push({ campaign_id: claimedId, ok: false, error: reason });
      }
    }
    return jsonResponse({ ok: true, processed: results.length, results });
  } catch (error) {
    if (error instanceof Response) return new Response(await error.text(), { status: error.status, headers: corsHeaders });
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
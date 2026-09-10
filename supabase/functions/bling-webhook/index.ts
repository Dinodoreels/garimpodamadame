// Public callback endpoint for Bling notifications (stock and order changes).
import { corsHeaders, getConfig, getSupabaseAdmin, jsonResponse, logSync } from "../_shared/bling.ts";
import { pullMarketplaceOrders } from "../_shared/bling-orders.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const raw = await req.text();
    let payload: any = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { raw };
    }

    const cfg = await getConfig();
    if (!cfg?.is_active) return jsonResponse({ ok: true, skipped: "integração desligada" });

    const event = String(payload?.event ?? payload?.tipo ?? payload?.evento ?? "unknown");
    await logSync({ entity_type: "webhook", action: event, status: "received", payload });

    const supa = getSupabaseAdmin();

    // Stock changed in Bling and Bling is the authority -> update the store
    if (cfg.sync_stock && cfg.stock_authority === "bling" && /estoque|stock/i.test(event)) {
      const data = payload?.data ?? payload?.retorno ?? payload;
      const blingProductId = String(data?.produto?.id ?? data?.produtoId ?? data?.id ?? "");
      const qty = Number(data?.saldoFisicoTotal ?? data?.saldo ?? data?.estoque ?? data?.quantidade ?? NaN);
      if (blingProductId && !Number.isNaN(qty)) {
        const { data: link } = await supa
          .from("bling_product_links")
          .select("variant_id")
          .eq("bling_product_id", blingProductId)
          .maybeSingle();
        if (link?.variant_id) {
          await supa.from("product_variants")
            .update({ inventory_quantity: Math.max(0, Math.trunc(qty)) })
            .eq("id", link.variant_id);
          await supa.from("bling_product_links")
            .update({ last_pulled_at: new Date().toISOString() })
            .eq("bling_product_id", blingProductId);
          await logSync({ entity_type: "stock", entity_id: blingProductId, action: "pull", status: "success", response: { qty } });
        }
      }
    }

    // Order changed in Bling -> import new marketplace orders
    if (cfg.pull_marketplace_orders && /pedido|order/i.test(event)) {
      pullMarketplaceOrders().catch(() => {});
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

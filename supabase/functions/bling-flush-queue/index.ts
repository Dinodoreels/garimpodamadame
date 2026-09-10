// Cron-triggered. Processes the pending Bling sync queue.
import { corsHeaders, getConfig, getSupabaseAdmin, jsonResponse, logSync } from "../_shared/bling.ts";
import { pushStockToBling, syncProductToBling } from "../_shared/bling-product-sync.ts";
import { pushOrderToBling } from "../_shared/bling-orders.ts";

const BATCH = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const cfg = await getConfig();
    if (!cfg?.is_active) return jsonResponse({ skipped: true, reason: "integração desligada" });

    const supa = getSupabaseAdmin();
    const { data: queue } = await supa
      .from("bling_sync_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(BATCH);

    if (!queue?.length) return jsonResponse({ processed: 0 });

    const results: any[] = [];
    for (const item of queue) {
      await supa.from("bling_sync_queue").update({ status: "processing" }).eq("id", item.id);
      try {
        if (item.action === "product") {
          await syncProductToBling(item.product_id);
        } else if (item.action === "stock") {
          const { data: link } = await supa
            .from("bling_product_links")
            .select("bling_product_id")
            .eq("variant_id", item.variant_id)
            .maybeSingle();
          const { data: variant } = await supa
            .from("product_variants")
            .select("inventory_quantity, price")
            .eq("id", item.variant_id)
            .maybeSingle();
          if (!link?.bling_product_id) throw new Error("Produto ainda não vinculado no Bling");
          await pushStockToBling(
            link.bling_product_id,
            variant?.inventory_quantity ?? 0,
            cfg.sync_prices && cfg.price_authority === "store" ? Number(variant?.price ?? 0) : undefined,
          );
        } else if (item.action === "order") {
          await pushOrderToBling(item.order_id);
        } else {
          throw new Error(`Ação desconhecida: ${item.action}`);
        }

        await supa.from("bling_sync_queue")
          .update({ status: "done", processed_at: new Date().toISOString(), last_error: null })
          .eq("id", item.id);
        results.push({ id: item.id, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const attempts = (item.attempts || 0) + 1;
        await supa.from("bling_sync_queue").update({
          status: attempts >= 5 ? "failed" : "pending",
          attempts,
          last_error: msg,
          scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }).eq("id", item.id);
        await logSync({ entity_type: item.action, entity_id: item.product_id ?? item.order_id, action: "queue", status: "error", error_message: msg });
        results.push({ id: item.id, ok: false, error: msg });
      }
    }
    return jsonResponse({ processed: results.length, results });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

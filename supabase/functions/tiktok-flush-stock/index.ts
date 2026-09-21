import { requireInternalOrAdmin } from '../_shared/internal-auth.ts'
// Cron-triggered. Flushes pending stock changes to TikTok Shop.
// Endpoint: POST /product/202309/products/{product_id}/inventory/update
import { callTikTok, corsHeaders, getConfig, getSupabaseAdmin, jsonResponse, logSync } from "../_shared/tiktok.ts";

const BATCH = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const access = await requireInternalOrAdmin(req)
  if (access instanceof Response) return new Response(access.body, { status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const cfg = await getConfig();
    if (!cfg?.is_active || !cfg?.auto_sync_products) {
      return jsonResponse({ skipped: true, reason: "integration off or auto-sync disabled" });
    }
    if (!cfg.warehouse_id) {
      return jsonResponse({ skipped: true, reason: "warehouse_id not configured" });
    }

    const supa = getSupabaseAdmin();
    const { data: queue } = await supa
      .from("tiktok_stock_queue")
      .select("id, variant_id, attempts")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(BATCH);

    if (!queue?.length) return jsonResponse({ processed: 0 });

    // Load variants + product links in one go
    const variantIds = [...new Set(queue.map((q) => q.variant_id))];
    const { data: variants } = await supa
      .from("product_variants")
      .select("id, product_id, sku, inventory_quantity")
      .in("id", variantIds);

    const productIds = [...new Set((variants ?? []).map((v) => v.product_id))];
    const { data: links } = await supa
      .from("tiktok_product_links")
      .select("product_id, tiktok_product_id")
      .in("product_id", productIds)
      .is("variant_id", null);

    const linkByProduct: Record<string, string> = {};
    (links ?? []).forEach((l: any) => {
      if (l.tiktok_product_id) linkByProduct[l.product_id] = l.tiktok_product_id;
    });
    const variantMap: Record<string, any> = {};
    (variants ?? []).forEach((v) => { variantMap[v.id] = v; });

    // Group queue entries by tiktok product_id; deduplicate variant updates (latest wins)
    const grouped: Record<string, { skus: Map<string, { seller_sku: string; quantity: number }>; queueIds: string[] }> = {};
    const skipped: { id: string; reason: string }[] = [];

    for (const q of queue) {
      const v = variantMap[q.variant_id];
      if (!v) { skipped.push({ id: q.id, reason: "variant not found" }); continue; }
      const ttProductId = linkByProduct[v.product_id];
      if (!ttProductId) { skipped.push({ id: q.id, reason: "product not linked" }); continue; }
      if (!v.sku) { skipped.push({ id: q.id, reason: "variant has no SKU" }); continue; }

      if (!grouped[ttProductId]) grouped[ttProductId] = { skus: new Map(), queueIds: [] };
      grouped[ttProductId].skus.set(v.sku, {
        seller_sku: v.sku,
        quantity: Math.max(0, v.inventory_quantity ?? 0),
      });
      grouped[ttProductId].queueIds.push(q.id);
    }

    // Mark skipped as processed with reason
    for (const s of skipped) {
      await supa.from("tiktok_stock_queue").update({
        processed_at: new Date().toISOString(),
        error_message: s.reason,
      }).eq("id", s.id);
    }

    const results: any[] = [];
    for (const [ttProductId, payload] of Object.entries(grouped)) {
      const skusArr = Array.from(payload.skus.values()).map((s) => ({
        seller_sku: s.seller_sku,
        inventory: [{ warehouse_id: cfg.warehouse_id, quantity: s.quantity }],
      }));

      try {
        const { status, data } = await callTikTok({
          path: `/product/202309/products/${ttProductId}/inventory/update`,
          method: "POST",
          body: { skus: skusArr },
        });
        if (status !== 200 || data?.code) {
          const errMsg = data?.message ?? `HTTP ${status}`;
          for (const qid of payload.queueIds) {
            const orig = queue.find((q) => q.id === qid);
            const attempts = (orig?.attempts ?? 0) + 1;
            if (attempts >= 5) {
              await supa.from("tiktok_stock_queue").update({
                processed_at: new Date().toISOString(),
                error_message: errMsg,
                attempts,
              }).eq("id", qid);
            } else {
              await supa.from("tiktok_stock_queue").update({
                error_message: errMsg,
                attempts,
              }).eq("id", qid);
            }
          }
          await logSync({ entity_type: "stock", entity_id: ttProductId, action: "update", status: "error", payload: { skus: skusArr }, response: data, error_message: errMsg });
          results.push({ tiktok_product_id: ttProductId, ok: false, error: errMsg });
        } else {
          await supa
            .from("tiktok_stock_queue")
            .update({ processed_at: new Date().toISOString(), error_message: null })
            .in("id", payload.queueIds);
          await logSync({ entity_type: "stock", entity_id: ttProductId, action: "update", status: "success", payload: { skus: skusArr } });
          results.push({ tiktok_product_id: ttProductId, ok: true, count: skusArr.length });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ tiktok_product_id: ttProductId, ok: false, error: msg });
      }
    }

    return jsonResponse({ processed: queue.length, results, skipped: skipped.length });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
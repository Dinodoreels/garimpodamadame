import { requireInternalOrAdmin } from '../_shared/internal-auth.ts'
// Cron-triggered. Processes pending products in tiktok_product_queue.
import { corsHeaders, getConfig, getSupabaseAdmin, jsonResponse } from "../_shared/tiktok.ts";
import { syncProductToTikTok } from "../_shared/tiktok-product-sync.ts";

const BATCH = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const access = await requireInternalOrAdmin(req)
  if (access instanceof Response) return new Response(access.body, { status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const cfg = await getConfig();
    if (!cfg?.is_active || !cfg?.auto_sync_products) {
      return jsonResponse({ skipped: true, reason: "integration off or auto-sync disabled" });
    }

    const supa = getSupabaseAdmin();
    const { data: queue } = await supa
      .from("tiktok_product_queue")
      .select("id, product_id, attempts")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(BATCH);

    if (!queue?.length) return jsonResponse({ processed: 0 });

    const results: any[] = [];
    for (const item of queue) {
      await supa.from("tiktok_product_queue").update({ status: "processing" }).eq("id", item.id);
      try {
        const r = await syncProductToTikTok(item.product_id);
        await supa
          .from("tiktok_product_queue")
          .update({ status: "done", processed_at: new Date().toISOString(), last_error: null })
          .eq("id", item.id);
        results.push({ id: item.id, ok: true, ...r });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const attempts = (item.attempts || 0) + 1;
        await supa
          .from("tiktok_product_queue")
          .update({
            status: attempts >= 5 ? "failed" : "pending",
            attempts,
            last_error: msg,
            scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          })
          .eq("id", item.id);
        results.push({ id: item.id, ok: false, error: msg });
      }
    }
    return jsonResponse({ processed: results.length, results });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

import { assertAdmin, corsHeaders, getSupabaseAdmin, jsonResponse } from "../_shared/bling.ts";
import { syncProductToBling } from "../_shared/bling-product-sync.ts";
import { runAutomaticTikTokPublication } from "../_shared/bling-auto-publish.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const ids: string[] = body.product_ids ?? (body.product_id ? [body.product_id] : []);
    if (!ids.length) return jsonResponse({ error: "Informe ao menos um produto." }, 400);

    const results: any[] = [];
    for (const id of ids) {
      try {
        const r = await syncProductToBling(id);
        const supa = getSupabaseAdmin();
        await supa
          .from("bling_sync_queue")
          .update({ status: "done", processed_at: new Date().toISOString(), last_error: null })
          .eq("product_id", id)
          .eq("action", "product")
          .in("status", ["pending", "processing"]);
        await runAutomaticTikTokPublication([id]);
        results.push({ product_id: id, ok: true, ...r });
      } catch (e) {
        results.push({ product_id: id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return jsonResponse({ results });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

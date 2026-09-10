// Queues every active store product for a push to Bling.
import { assertAdmin, corsHeaders, getConfig, getSupabaseAdmin, jsonResponse } from "../_shared/bling.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const cfg = await getConfig();
    if (!cfg?.is_active) return jsonResponse({ error: "Conecte e ative o Bling primeiro." }, 400);

    const supa = getSupabaseAdmin();
    const { data: products } = await supa
      .from("products")
      .select("id")
      .eq("status", "active");

    if (!products?.length) return jsonResponse({ queued: 0 });

    await supa.from("bling_sync_queue").insert(
      products.map((p) => ({ product_id: p.id, action: "product" })),
    );
    return jsonResponse({ queued: products.length });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

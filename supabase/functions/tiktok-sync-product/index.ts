import { assertAdmin, corsHeaders, jsonResponse } from "../_shared/tiktok.ts";
import { syncProductToTikTok } from "../_shared/tiktok-product-sync.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const { product_id, product_ids } = await req.json();
    const ids: string[] = product_ids ?? (product_id ? [product_id] : []);
    if (!ids.length) return jsonResponse({ error: "product_id obrigatório" }, 400);

    const results: any[] = [];
    for (const id of ids) {
      try {
        const r = await syncProductToTikTok(id);
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

import {
  assertAdmin,
  callTikTok,
  corsHeaders,
  getSupabaseAdmin,
  jsonResponse,
  logSync,
} from "../_shared/tiktok.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const { product_id } = await req.json();
    if (!product_id) return jsonResponse({ error: "product_id obrigatório" }, 400);

    const supa = getSupabaseAdmin();
    const { data: link } = await supa
      .from("tiktok_product_links")
      .select("tiktok_product_id")
      .eq("product_id", product_id)
      .is("variant_id", null)
      .maybeSingle();
    if (!link?.tiktok_product_id) return jsonResponse({ error: "Produto não publicado no TikTok" }, 404);

    const { status, data } = await callTikTok({
      path: "/product/202309/products/deactivate",
      method: "POST",
      body: { product_ids: [link.tiktok_product_id] },
    });
    if (status !== 200 || data?.code) {
      await logSync({ entity_type: "product", entity_id: product_id, action: "deactivate", status: "error", response: data, error_message: data?.message });
      return jsonResponse({ error: data?.message ?? "Falha ao despublicar" }, 502);
    }
    await supa
      .from("tiktok_product_links")
      .update({ tiktok_status: "DEACTIVATED", status: "synced" })
      .eq("product_id", product_id)
      .is("variant_id", null);
    await logSync({ entity_type: "product", entity_id: product_id, action: "deactivate", status: "success", response: data });
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
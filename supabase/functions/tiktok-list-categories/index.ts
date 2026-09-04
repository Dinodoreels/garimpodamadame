import { assertAdmin, callTikTok, corsHeaders, jsonResponse } from "../_shared/tiktok.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("category_id");

    if (categoryId) {
      // Fetch required attributes for a specific leaf category
      const { status, data } = await callTikTok({
        path: `/product/202309/categories/${categoryId}/attributes`,
        method: "GET",
        query: { category_version: "v1" },
      });
      if (status !== 200 || data?.code) return jsonResponse({ error: data?.message ?? "TikTok error", raw: data }, 502);
      return jsonResponse({ attributes: data?.data?.attributes ?? [] });
    }

    // Full category tree
    const { status, data } = await callTikTok({
      path: "/product/202309/categories",
      method: "GET",
      query: { category_version: "v1", locale: "pt-BR" },
    });
    if (status !== 200 || data?.code) return jsonResponse({ error: data?.message ?? "TikTok error", raw: data }, 502);
    return jsonResponse({ categories: data?.data?.categories ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
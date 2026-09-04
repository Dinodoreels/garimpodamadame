import { assertAdmin, callTikTok, corsHeaders, jsonResponse } from "../_shared/tiktok.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const { status, data } = await callTikTok({
      path: "/logistics/202309/warehouses",
      method: "GET",
    });
    if (status !== 200 || data?.code) return jsonResponse({ error: data?.message ?? "TikTok error", raw: data }, 502);
    return jsonResponse({ warehouses: data?.data?.warehouses ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
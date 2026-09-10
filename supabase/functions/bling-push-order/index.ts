import { assertAdmin, corsHeaders, jsonResponse } from "../_shared/bling.ts";
import { pushOrderToBling } from "../_shared/bling-orders.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return jsonResponse({ error: "order_id obrigatório" }, 400);
    const result = await pushOrderToBling(order_id);
    return jsonResponse(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

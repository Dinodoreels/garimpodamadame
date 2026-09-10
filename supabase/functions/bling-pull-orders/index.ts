// Cron-triggered (and manually callable by admins). Imports marketplace orders from Bling.
import { assertAdmin, corsHeaders, jsonResponse } from "../_shared/bling.ts";
import { pullMarketplaceOrders } from "../_shared/bling-orders.ts";

function isCronCaller(req: Request): boolean {
  const token = Deno.env.get("BLING_CRON_TOKEN");
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!isCronCaller(req)) {
      await assertAdmin(req);
    }
    const body = await req.json().catch(() => ({} as any));
    const result = await pullMarketplaceOrders(body?.since);
    return jsonResponse(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

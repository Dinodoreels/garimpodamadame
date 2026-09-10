// Cron-triggered (and manually callable by admins). Imports marketplace orders from Bling.
import { assertAdmin, corsHeaders, jsonResponse } from "../_shared/bling.ts";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { pullMarketplaceOrders } from "../_shared/bling-orders.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (authenticateCronRequest(req) !== null) {
      // Not the cron caller — require an admin session instead.
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

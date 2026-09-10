// Cron-triggered (and manually callable by admins). Imports marketplace orders from Bling.
import { corsHeaders, jsonResponse } from "../_shared/bling.ts";
import { pullMarketplaceOrders } from "../_shared/bling-orders.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({} as any));
    const result = await pullMarketplaceOrders(body?.since);
    return jsonResponse(result);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

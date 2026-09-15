// Cron-triggered (and manually callable by admins). Imports marketplace orders from Bling.
import { assertAdmin, corsHeaders, jsonResponse } from "../_shared/bling.ts";
import { pullMarketplaceOrders } from "../_shared/bling-orders.ts";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  since: z.string().datetime().optional(),
  full_history: z.boolean().optional(),
  days: z.number().int().min(1).max(365).optional(),
});

function isCronCaller(req: Request): boolean {
  const token = Deno.env.get("BLING_CRON_TOKEN");
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const cronCaller = isCronCaller(req);
    if (!cronCaller) {
      await assertAdmin(req);
    }
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
    const result = await pullMarketplaceOrders({
      sinceIso: parsed.data.since,
      fullHistory: parsed.data.full_history ?? !cronCaller,
      days: parsed.data.days ?? 90,
    });
    return jsonResponse(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

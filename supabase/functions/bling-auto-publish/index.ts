import { assertAdmin, corsHeaders, jsonResponse } from '../_shared/bling.ts';
import { runAutomaticTikTokPublication } from '../_shared/bling-auto-publish.ts';

function isInternalCaller(req: Request) {
  const token = Deno.env.get('BLING_CRON_TOKEN');
  return Boolean(token) && req.headers.get('authorization') === `Bearer ${token}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!isInternalCaller(req)) await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const productIds = Array.isArray(body.product_ids)
      ? body.product_ids.filter((id: unknown): id is string => typeof id === 'string').slice(0, 50)
      : undefined;
    return jsonResponse(await runAutomaticTikTokPublication(productIds));
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
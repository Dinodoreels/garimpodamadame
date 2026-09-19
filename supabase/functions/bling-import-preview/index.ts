import { assertAdmin, corsHeaders, jsonResponse } from '../_shared/bling.ts';
import { prepareImportRun } from '../_shared/bling-import.ts';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  product_ids: z.array(z.string().min(1)).max(50).optional(),
});

function isCronCaller(req: Request) {
  const token = Deno.env.get('BLING_CRON_TOKEN');
  return Boolean(token) && req.headers.get('authorization') === `Bearer ${token}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const cron = isCronCaller(req);
    const userId = cron ? null : await assertAdmin(req);
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
    return jsonResponse(await prepareImportRun(userId, { productIds: parsed.data.product_ids }));
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

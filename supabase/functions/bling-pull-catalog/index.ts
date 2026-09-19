import { z } from 'npm:zod@3.23.8';
import { assertAdmin, corsHeaders, jsonResponse } from '../_shared/bling.ts';
import { pullLinkedBlingProducts } from '../_shared/bling-catalog-pull.ts';

const BodySchema = z.object({
  product_ids: z.array(z.string().min(1)).max(50).optional(),
  batch_size: z.number().int().min(1).max(50).optional(),
});

function isCronCaller(req: Request) {
  const token = Deno.env.get('BLING_CRON_TOKEN');
  return Boolean(token) && req.headers.get('authorization') === `Bearer ${token}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!isCronCaller(req)) await assertAdmin(req);
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
    return jsonResponse(await pullLinkedBlingProducts({
      blingProductIds: parsed.data.product_ids,
      batchSize: parsed.data.batch_size,
    }));
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
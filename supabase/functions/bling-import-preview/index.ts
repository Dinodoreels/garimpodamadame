import { assertAdmin, corsHeaders, jsonResponse } from '../_shared/bling.ts';
import { prepareImportRun } from '../_shared/bling-import.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await assertAdmin(req);
    return jsonResponse(await prepareImportRun(userId));
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

import { assertAdmin, corsHeaders, getSupabaseAdmin, jsonResponse, logSync } from '../_shared/bling.ts';

const allowed = new Set(['approved', 'rejected']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const runId = typeof body?.run_id === 'string' ? body.run_id : '';
    const decision = typeof body?.decision === 'string' ? body.decision : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';
    if (!runId || !allowed.has(decision) || reason.length < 3) {
      return jsonResponse({ error: 'Informe a decisão e um motivo com pelo menos 3 caracteres.' }, 400);
    }

    const supa = getSupabaseAdmin();
    const { data: run } = await supa.from('bling_import_runs').select('id, status').eq('id', runId).maybeSingle();
    if (!run) return jsonResponse({ error: 'Lote não encontrado.' }, 404);
    if (run.status === 'applying') return jsonResponse({ error: 'Este lote está sendo aplicado e não pode ser alterado agora.' }, 409);

    const now = new Date().toISOString();
    const { error: decisionError } = await supa.from('bling_import_run_decisions').insert({
      run_id: runId,
      decision,
      reason,
      created_by: userId,
    });
    if (decisionError) throw decisionError;

    const { error: updateError } = await supa.from('bling_import_runs').update({
      decision,
      decision_reason: reason,
      decided_by: userId,
      decided_at: now,
      error_message: null,
    }).eq('id', runId);
    if (updateError) throw updateError;

    await logSync({ entity_type: 'import', entity_id: runId, action: decision, status: 'success', payload: { reason }, response: { actor: userId } });
    return jsonResponse({ ok: true, decision, decided_at: now });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
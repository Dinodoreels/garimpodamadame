// Grava as peças bipadas no Garimpo Scan.
// Aceita tanto o painel (JWT) quanto o tablet do galpão (token de operador).
import {
  OPERATOR_CORS, adminClient, resolveOperator, resolveAdminUser,
  CD_SCAN_ROLES, jsonResponse,
} from "../_shared/operator.ts";

const CONFIDENCE_THRESHOLD = 0.75;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: OPERATOR_CORS });

  const db = adminClient();
  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Requisição inválida.' }, 400);
  }

  const operator = await resolveOperator(req, db);
  const user = operator ? null : await resolveAdminUser(req, db);
  const allowed = operator
    ? CD_SCAN_ROLES.includes(operator.role)
    : !!user && user.roles.some((r) => CD_SCAN_ROLES.includes(r));
  if (!allowed) {
    return jsonResponse({ ok: false, error: 'Sem permissão para bipar peças.' }, 403);
  }

  const action = String(body.action ?? 'save');

  try {
    if (action === 'lots') {
      const { data } = await db
        .from('lots')
        .select('id, code, description, status, expected_units, processed_units')
        .in('status', ['open', 'processing'])
        .order('created_at', { ascending: false });
      return jsonResponse({ ok: true, lots: data ?? [] });
    }

    if (action === 'lot_stats') {
      const lotId = String(body.lot_id ?? '');
      const { count } = await db
        .from('inbound_items')
        .select('id', { count: 'exact', head: true })
        .eq('lot_id', lotId);
      const { count: pending } = await db
        .from('inbound_pendings')
        .select('id', { count: 'exact', head: true })
        .eq('lot_id', lotId).eq('status', 'open');
      return jsonResponse({ ok: true, scanned: count ?? 0, pending: pending ?? 0 });
    }

    if (action === 'save') {
      const lotId = body.lot_id ? String(body.lot_id) : null;
      if (!lotId) return jsonResponse({ ok: false, error: 'Escolha o lote antes de bipar.' }, 400);

      const { data: lot } = await db
        .from('lots')
        .select('id, receipt_id, status, processed_units')
        .eq('id', lotId).maybeSingle();
      if (!lot) return jsonResponse({ ok: false, error: 'Lote não encontrado.' }, 404);
      if (['closed', 'cancelled'].includes(lot.status)) {
        return jsonResponse({ ok: false, error: 'Esse lote está fechado.' }, 400);
      }

      const confidence = body.ai_confidence === null || body.ai_confidence === undefined
        ? null
        : Number(body.ai_confidence);
      const source = String(body.ai_source ?? 'manual');
      const hasProduct = !!body.product_id || !!body.variant_id;
      const needsReview = source === 'ai'
        && !hasProduct
        && (confidence === null || confidence < CONFIDENCE_THRESHOLD);

      const quantity = Math.max(1, Number(body.quantity ?? 1));
      const state = needsReview ? 'SCAN_PENDING' : 'IDENTIFIED';

      const { data: item, error } = await db.from('inbound_items').insert({
        lot_id: lotId,
        receipt_id: lot.receipt_id,
        state,
        condition_code: String(body.condition_code ?? 'T1'),
        barcode: body.barcode ? String(body.barcode) : null,
        quantity,
        product_id: body.product_id ?? null,
        variant_id: body.variant_id ?? null,
        sku: body.sku ?? null,
        title: body.title ?? null,
        brand: body.brand ?? null,
        category: body.category ?? null,
        attributes: body.attributes ?? {},
        photo_path: body.photo_path ?? null,
        ai_source: source,
        ai_confidence: confidence,
        ai_data: body.ai_data ?? null,
        cost: body.cost ?? null,
        suggested_price: body.suggested_price ?? null,
        notes: body.notes ?? null,
        operator_code: operator?.code ?? null,
        created_by: user?.id ?? null,
      }).select('id, state').single();

      if (error) return jsonResponse({ ok: false, error: error.message }, 400);

      if (needsReview) {
        await db.from('inbound_pendings').insert({
          item_id: item.id,
          lot_id: lotId,
          reason: 'low_confidence',
          ai_suggestions: body.ai_data ?? null,
          created_by: user?.id ?? null,
        });
      }

      await db.from('lots')
        .update({ processed_units: (lot.processed_units ?? 0) + quantity, status: 'processing' })
        .eq('id', lotId);

      await db.from('inbound_events').insert({
        entity_type: 'inbound_item',
        entity_id: item.id,
        action: needsReview ? 'scan_pending' : 'scan_identified',
        after_data: {
          lot_id: lotId, barcode: body.barcode ?? null, title: body.title ?? null,
          quantity, confidence, source,
        },
        actor_id: user?.id ?? null,
        source: operator ? `operador:${operator.code}` : 'painel',
      });

      return jsonResponse({ ok: true, item_id: item.id, state, pending: needsReview });
    }

    return jsonResponse({ ok: false, error: 'Ação desconhecida.' }, 400);
  } catch (e) {
    console.error('inbound-scan error', e);
    return jsonResponse({ ok: false, error: 'Falha ao gravar a peça.' }, 500);
  }
});

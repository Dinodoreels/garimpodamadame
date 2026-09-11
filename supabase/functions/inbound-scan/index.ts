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
      const { data: scannedItems } = await db
        .from('inbound_items')
        .select('quantity')
        .eq('lot_id', lotId);
      const { count: pending } = await db
        .from('inbound_pendings')
        .select('id', { count: 'exact', head: true })
        .eq('lot_id', lotId).eq('status', 'open');
      const scanned = (scannedItems ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
      return jsonResponse({ ok: true, scanned, pending: pending ?? 0 });
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
      const forceReview = body.force_review === true;
      const needsReview = forceReview || (!hasProduct && source !== 'manual'
        && (confidence === null || confidence < CONFIDENCE_THRESHOLD));

      const quantity = Math.max(1, Number(body.quantity ?? 1));
      const state = needsReview ? 'SCAN_PENDING' : 'IDENTIFIED';

      // Foto da peça: guardada no balde privado inbound-docs.
      let photoPath: string | null = body.photo_path ?? null;
      if (!photoPath && typeof body.photo_base64 === 'string' && body.photo_base64.includes(',')) {
        try {
          const [meta, b64] = body.photo_base64.split(',');
          const mime = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
            return jsonResponse({ ok: false, error: 'A foto precisa ser JPG, PNG ou WebP.' }, 400);
          }
          if (b64.length > 7_000_000) {
            return jsonResponse({ ok: false, error: 'A foto ultrapassa o limite de 5 MB.' }, 400);
          }
          const ext = mime.includes('png') ? 'png' : 'jpg';
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          if (bytes.byteLength > 5 * 1024 * 1024) {
            return jsonResponse({ ok: false, error: 'A foto ultrapassa o limite de 5 MB.' }, 400);
          }
          const path = `items/${lotId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await db.storage.from('inbound-docs')
            .upload(path, bytes, { contentType: mime, upsert: false });
          if (upErr) return jsonResponse({ ok: false, error: 'Não foi possível salvar a foto.' }, 400);
          photoPath = path;
        } catch (err) {
          console.warn('falha ao salvar foto', err);
          return jsonResponse({ ok: false, error: 'A foto enviada é inválida.' }, 400);
        }
      }

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
        photo_path: photoPath,
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
          reason: forceReview ? 'manual' : 'low_confidence',
          ai_suggestions: body.ai_data ?? null,
          created_by: user?.id ?? null,
        });
      }

      if (Array.isArray(body.identification_result_ids) && body.identification_result_ids.length) {
        const resultIds = body.identification_result_ids.map(String);
        await db.from('inbound_identification_results')
          .update({ item_id: item.id })
          .in('id', resultIds);
        const { data: refs } = await db.from('inbound_identification_results')
          .select('source,title,product_url,image_url,raw_data')
          .in('id', resultIds)
          .not('product_url', 'is', null);
        if (refs?.length) {
          await db.from('inbound_market_references').insert(refs.map((ref) => ({
            item_id: item.id, source: ref.source, title: ref.title,
            url: ref.product_url, image_url: ref.image_url,
            price: Number((ref.raw_data as Record<string, unknown> | null)?.price ?? 0) || null,
            created_by: user?.id ?? null,
          })));
        }
      }

      if (photoPath) {
        await db.from('inbound_item_photos').insert({
          item_id: item.id, kind: 'product', file_path: photoPath,
          caption: 'Foto do Garimpo Scan', created_by: user?.id ?? null,
        });
      }

      const { error: counterError } = await db.rpc('increment_lot_processed_units', {
        target_lot_id: lotId,
        units_to_add: quantity,
      });
      if (counterError) throw counterError;

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

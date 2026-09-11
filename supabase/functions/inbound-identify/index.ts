// Identificação em camadas: catálogo Vanguard, base brasileira de GTIN e busca visual.
import { adminClient, resolveOperator, resolveAdminUser, CD_SCAN_ROLES, jsonResponse } from "../_shared/operator.ts";

const normalizeCode = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

async function record(db: ReturnType<typeof adminClient>, row: Record<string, unknown>) {
  const { data } = await db.from('inbound_identification_results').insert(row).select('id').single();
  return data?.id ?? null;
}

async function cosmosLookup(barcode: string) {
  const token = Deno.env.get('COSMOS_API_TOKEN');
  if (!token) return { configured: false, candidates: [] as Record<string, unknown>[] };
  const started = Date.now();
  const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${encodeURIComponent(barcode)}.json`, {
    headers: { 'X-Cosmos-Token': token, 'User-Agent': 'Vanguard Store Inbound/1.0', Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cosmos ${res.status}: ${JSON.stringify(body).slice(0, 240)}`);
  const item = body as Record<string, any>;
  return {
    configured: true,
    duration: Date.now() - started,
    raw: item,
    candidates: [{
      title: item.description ?? item.product?.description ?? null,
      brand: item.brand?.name ?? item.brand ?? null,
      category: item.ncm?.description ?? item.category?.description ?? null,
      gtin: String(item.gtin ?? barcode),
      image_url: item.thumbnail ?? item.image ?? null,
      product_url: item.url ?? null,
      confidence: item.description ? 0.92 : 0.55,
      source: 'cosmos',
    }],
  };
}

async function visualLookup(imageBase64: string, db: ReturnType<typeof adminClient>) {
  const key = Deno.env.get('SERPAPI_API_KEY');
  if (!key) return { configured: false, candidates: [] as Record<string, unknown>[] };
  const match = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error('Imagem inválida para pesquisa visual.');
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('A foto ultrapassa 5 MB.');
  const ext = match[1].includes('png') ? 'png' : match[1].includes('webp') ? 'webp' : 'jpg';
  const path = `identification-temp/${crypto.randomUUID()}.${ext}`;
  const uploaded = await db.storage.from('inbound-docs').upload(path, bytes, { contentType: match[1] });
  if (uploaded.error) throw uploaded.error;
  try {
    const signed = await db.storage.from('inbound-docs').createSignedUrl(path, 300);
    if (!signed.data?.signedUrl) throw new Error('Não foi possível preparar a foto.');
    const started = Date.now();
    const params = new URLSearchParams({ engine: 'google_lens', url: signed.data.signedUrl, api_key: key, country: 'br', hl: 'pt-br' });
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Busca visual ${res.status}: ${JSON.stringify(body).slice(0, 240)}`);
    const rows = [...(body.visual_matches ?? []), ...(body.products ?? [])].slice(0, 8);
    return {
      configured: true,
      duration: Date.now() - started,
      raw: body,
      candidates: rows.map((row: Record<string, any>, index: number) => ({
        title: row.title ?? null,
        brand: row.source ?? null,
        category: null,
        gtin: null,
        image_url: row.thumbnail ?? row.image ?? null,
        product_url: row.link ?? null,
        price: row.extracted_price ?? null,
        confidence: Math.max(0.35, 0.78 - index * 0.06),
        source: 'google_lens',
      })),
    };
  } finally {
    await db.storage.from('inbound-docs').remove([path]);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-operator-token' } });
  const db = adminClient();
  const operator = await resolveOperator(req, db);
  const user = operator ? null : await resolveAdminUser(req, db);
  const allowed = operator ? CD_SCAN_ROLES.includes(operator.role) : !!user && user.roles.some((role: string) => CD_SCAN_ROLES.includes(role));
  if (!allowed) return jsonResponse({ ok: false, error: 'Sem permissão para identificar peças.' }, 403);

  const body = await req.json().catch(() => ({}));
  const barcode = body?.barcode ? normalizeCode(String(body.barcode)) : '';
  const imageBase64 = typeof body?.image_base64 === 'string' ? body.image_base64 : '';
  if (!barcode && !imageBase64) return jsonResponse({ ok: false, error: 'Informe um código de barras ou uma foto.' }, 400);
  const cacheKey = barcode ? `barcode:${barcode}` : null;

  try {
    if (barcode) {
      const { data: local } = await db.from('product_variants')
        .select('id, title, sku, barcode, price, cost, product_id, products(id, title, vendor, product_type)')
        .or(`barcode.eq.${barcode},sku.eq.${barcode}`).limit(1).maybeSingle();
      if (local) {
        const product = (local.products ?? {}) as Record<string, unknown>;
        const result = { product_id: local.product_id, variant_id: local.id, sku: local.sku, title: product.title ?? local.title, brand: product.vendor ?? null, category: product.product_type ?? null, price: local.price, cost: local.cost };
        const resultId = await record(db, { cache_key: cacheKey, source: 'catalog', query_type: 'barcode', query_value: barcode, title: result.title, brand: result.brand, category: result.category, gtin: barcode, confidence: 1, is_selected: true, raw_data: result });
        return jsonResponse({ ok: true, source: 'catalog', confidence: 1, match: result, candidates: [{ ...result, source: 'catalog', confidence: 1 }], result_ids: [resultId].filter(Boolean) });
      }

      const { data: cached } = await db.from('inbound_identification_results').select('*').eq('cache_key', cacheKey).is('error_message', null).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('confidence', { ascending: false }).limit(5);
      if (cached?.length) {
        const candidates = cached.map(row => ({ title: row.title, brand: row.brand, category: row.category, gtin: row.gtin, image_url: row.image_url, product_url: row.product_url, confidence: row.confidence, source: row.source }));
        return jsonResponse({ ok: true, source: cached[0].source, confidence: Number(cached[0].confidence ?? 0), result: candidates[0], candidates, result_ids: cached.map(row => row.id), cached: true });
      }
    }

    const candidates: Record<string, any>[] = [];
    const ids: string[] = [];
    const errors: string[] = [];
    if (barcode) {
      try {
        const found = await cosmosLookup(barcode);
        for (const candidate of found.candidates) {
          candidates.push(candidate);
          const id = await record(db, { cache_key: cacheKey, source: 'cosmos', query_type: 'barcode', query_value: barcode, ...candidate, duration_ms: found.duration, raw_data: found.raw });
          if (id) ids.push(id);
        }
        if (!found.configured) errors.push('Cosmos não configurado');
      } catch (error) { errors.push(error instanceof Error ? error.message : 'Falha na consulta GTIN'); }
    }
    if (imageBase64) {
      try {
        const found = await visualLookup(imageBase64, db);
        for (const candidate of found.candidates) {
          candidates.push(candidate);
          const id = await record(db, { source: 'google_lens', query_type: 'image', ...candidate, duration_ms: found.duration, raw_data: candidate });
          if (id) ids.push(id);
        }
        if (!found.configured) errors.push('Busca visual não configurada');
      } catch (error) { errors.push(error instanceof Error ? error.message : 'Falha na busca visual'); }
    }
    candidates.sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0));
    const best = candidates[0] ?? null;
    return jsonResponse({ ok: true, source: best?.source ?? 'external', confidence: Number(best?.confidence ?? 0), result: best, candidates, result_ids: ids, needs_review: !best || Number(best.confidence ?? 0) < 0.75, warnings: errors });
  } catch (error) {
    console.error('inbound-identify', error);
    return jsonResponse({ ok: false, error: 'Não foi possível consultar as fontes de identificação. Envie para Pendências.' }, 502);
  }
});
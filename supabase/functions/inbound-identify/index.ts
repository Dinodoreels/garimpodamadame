// Identificação em camadas com três referências reais e síntese comercial por IA.
import { adminClient, resolveOperator, resolveAdminUser, CD_SCAN_ROLES, jsonResponse } from "../_shared/operator.ts";

type Candidate = {
  id?: string;
  title: string | null;
  brand: string | null;
  category: string | null;
  gtin: string | null;
  image_url: string | null;
  product_url: string | null;
  price: number | null;
  condition: string | null;
  confidence: number;
  source: string;
};

const normalizeCode = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
const text = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function record(db: ReturnType<typeof adminClient>, row: Record<string, unknown>) {
  const { data } = await db.from('inbound_identification_results').insert(row).select('id').single();
  return data?.id ?? null;
}

async function cosmosLookup(barcode: string): Promise<Candidate[]> {
  const token = Deno.env.get('COSMOS_API_TOKEN');
  if (!token) return [];
  const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${encodeURIComponent(barcode)}.json`, {
    headers: { 'X-Cosmos-Token': token, 'User-Agent': 'Vanguard Store Inbound/1.0', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Base GTIN indisponível (${res.status}).`);
  const item = await res.json();
  return [{
    title: item.description ?? item.product?.description ?? null,
    brand: item.brand?.name ?? item.brand ?? null,
    category: item.ncm?.description ?? item.category?.description ?? null,
    gtin: String(item.gtin ?? barcode), image_url: item.thumbnail ?? item.image ?? null,
    product_url: item.url ?? null, price: null, condition: null,
    confidence: item.description ? 0.92 : 0.55, source: 'cosmos',
  }];
}

async function uploadSearchImage(imageBase64: string, db: ReturnType<typeof adminClient>) {
  const match = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error('Imagem inválida para pesquisa visual.');
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('A foto ultrapassa 5 MB.');
  const ext = match[1].includes('png') ? 'png' : match[1].includes('webp') ? 'webp' : 'jpg';
  const path = `identification-temp/${crypto.randomUUID()}.${ext}`;
  const uploaded = await db.storage.from('inbound-docs').upload(path, bytes, { contentType: match[1] });
  if (uploaded.error) throw uploaded.error;
  const signed = await db.storage.from('inbound-docs').createSignedUrl(path, 300);
  if (!signed.data?.signedUrl) throw new Error('Não foi possível preparar a foto.');
  return { path, signedUrl: signed.data.signedUrl };
}

function mapSerpRows(body: Record<string, any>, source: string): Candidate[] {
  const rows = [...(body.visual_matches ?? []), ...(body.shopping_results ?? []), ...(body.products ?? [])];
  return rows.map((row: Record<string, any>, index: number) => ({
    title: row.title ?? null,
    brand: row.source ?? row.merchant_name ?? null,
    category: null,
    gtin: null,
    image_url: row.thumbnail ?? row.image ?? null,
    product_url: row.link ?? row.product_link ?? null,
    price: Number(row.extracted_price ?? row.price?.value ?? 0) || null,
    condition: row.condition ?? null,
    confidence: Math.max(0.4, 0.86 - index * 0.035),
    source: text(row.source ?? row.merchant_name, 100) || source,
  }));
}

async function serpLookup(params: URLSearchParams): Promise<Candidate[]> {
  const key = Deno.env.get('SERPAPI_API_KEY');
  if (!key) return [];
  params.set('api_key', key);
  params.set('country', 'br');
  params.set('hl', 'pt-br');
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Pesquisa de anúncios indisponível (${res.status}).`);
  return mapSerpRows(body, params.get('engine') === 'google_lens' ? 'Google Lens' : 'Google Shopping');
}

function selectComparables(candidates: Candidate[]) {
  const seen = new Set<string>();
  return candidates
    .filter(row => row.title && row.product_url && row.price != null && row.price > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .filter(row => {
      const key = `${row.product_url}|${row.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

async function readResponseStream(response: Response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'response.output_text.delta') output += event.delta ?? '';
      } catch { /* keepalive */ }
    }
  }
  return output;
}

async function synthesize(barcode: string, hint: string, candidates: Candidate[]) {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key || !candidates.length) return null;
  const response = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch' },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra', stream: true,
      reasoning: { effort: 'low', summary: 'auto' }, include: ['reasoning.encrypted_content'],
      input: [{ role: 'user', content: [{ type: 'input_text', text: `Gere JSON de cadastro comercial em português brasileiro usando somente as referências reais abaixo. Compare marca, modelo, condição e preço. Não invente GTIN, marca, categoria fiscal, NCM, CEST, origem, peso ou dimensões. Sugira o preço mais adequado, não uma média automática. Código: ${barcode || 'não informado'}. Observação: ${hint || 'nenhuma'}. Referências: ${JSON.stringify(candidates)}` }] }],
      text: { format: { type: 'json_schema', name: 'inbound_product', strict: true, schema: {
        type: 'object', additionalProperties: false,
        properties: {
          title: { type: 'string' }, description: { type: 'string' }, brand: { type: ['string','null'] },
          category: { type: ['string','null'] }, condition_guess: { type: ['string','null'] },
          estimated_price_brl: { type: 'number' }, confidence: { type: 'number' }, reasoning_note: { type: 'string' },
        },
        required: ['title','description','brand','category','condition_guess','estimated_price_brl','confidence','reasoning_note'],
      } } },
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || 'Falha na análise por IA.');
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const output = await readResponseStream(response);
  return output ? JSON.parse(output) : null;
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
  const hint = text(body?.hint, 500);
  if (!barcode && !imageBase64) return jsonResponse({ ok: false, error: 'Informe um código de barras ou uma foto.' }, 400);
  const cacheKey = barcode ? `barcode:${barcode}` : null;

  try {
    if (barcode) {
      const { data: local } = await db.from('product_variants')
        .select('id,title,sku,barcode,gtin,price,cost,product_id,products(id,title,description,vendor,product_type,product_images(url,position))')
        .or(`barcode.eq.${barcode},gtin.eq.${barcode},sku.eq.${barcode}`).limit(1).maybeSingle();
      if (local) {
        const product = (local.products ?? {}) as Record<string, any>;
        const images = (product.product_images ?? []).sort((a: any, b: any) => Number(a.position) - Number(b.position)).map((row: any) => row.url);
        const result = { product_id: local.product_id, variant_id: local.id, sku: local.sku, title: product.title ?? local.title, description: product.description ?? null, brand: product.vendor ?? null, category: product.product_type ?? null, price: local.price, estimated_price_brl: local.price, cost: local.cost, image_urls: images, comparable_count: 0 };
        const resultId = await record(db, { cache_key: cacheKey, source: 'catalog', query_type: 'barcode', query_value: barcode, title: result.title, brand: result.brand, category: result.category, gtin: barcode, confidence: 1, is_selected: true, raw_data: result });
        return jsonResponse({ ok: true, source: 'catalog', confidence: 1, match: result, result, candidates: [], result_ids: [resultId].filter(Boolean) });
      }
    }

    const warnings: string[] = [];
    const sourceCandidates: Candidate[] = [];
    let tempPath: string | null = null;
    try {
      if (barcode) {
        try { sourceCandidates.push(...await cosmosLookup(barcode)); } catch (error) { warnings.push(error instanceof Error ? error.message : 'Falha na base GTIN.'); }
        try { sourceCandidates.push(...await serpLookup(new URLSearchParams({ engine: 'google_shopping', q: barcode }))); } catch (error) { warnings.push(error instanceof Error ? error.message : 'Falha ao buscar anúncios pelo código.'); }
      }
      if (imageBase64) {
        try {
          const uploaded = await uploadSearchImage(imageBase64, db);
          tempPath = uploaded.path;
          sourceCandidates.push(...await serpLookup(new URLSearchParams({ engine: 'google_lens', url: uploaded.signedUrl })));
        } catch (error) { warnings.push(error instanceof Error ? error.message : 'Falha na busca visual.'); }
      }

      const comparables = selectComparables(sourceCandidates);
      const catalogCandidate = sourceCandidates.find(candidate => candidate.source === 'cosmos') ?? null;
      let aiResult: Record<string, any> | null = null;
      try { aiResult = await synthesize(barcode, hint, comparables.length ? comparables : sourceCandidates.slice(0, 3)); }
      catch (error) {
        const status = (error as Error & { status?: number }).status;
        if (status === 402 || status === 403) throw error;
        warnings.push(error instanceof Error ? error.message : 'Falha na análise por IA.');
      }

      const ids: string[] = [];
      for (const candidate of comparables) {
        const id = await record(db, { cache_key: cacheKey, source: candidate.source, query_type: imageBase64 ? 'image' : 'barcode', query_value: barcode || null, title: candidate.title, brand: candidate.brand, category: candidate.category, gtin: candidate.gtin, image_url: candidate.image_url, product_url: candidate.product_url, confidence: candidate.confidence, is_selected: true, raw_data: candidate });
        if (id) { candidate.id = id; ids.push(id); }
      }
      const prices = comparables.map(row => row.price).filter((price): price is number => price != null && price > 0);
      const fallbackPrice = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null;
      const imageUrls = [...new Set(comparables.map(row => row.image_url).filter((value): value is string => !!value))];
      const result = {
        title: aiResult?.title ?? catalogCandidate?.title ?? comparables[0]?.title ?? '',
        description: aiResult?.description ?? null,
        brand: aiResult?.brand ?? catalogCandidate?.brand ?? null,
        category: aiResult?.category ?? catalogCandidate?.category ?? null,
        color: null, size: null,
        condition_guess: aiResult?.condition_guess ?? comparables[0]?.condition ?? null,
        estimated_price_brl: Number(aiResult?.estimated_price_brl ?? fallbackPrice ?? 0) || null,
        confidence: Math.max(0, Math.min(1, Number(aiResult?.confidence ?? (comparables.length === 3 ? 0.82 : 0.62)))),
        reasoning_note: aiResult?.reasoning_note ?? 'Sugestão baseada nas referências disponíveis.',
        source: 'external', gtin: barcode || null, sku: barcode ? `GDM-${barcode}` : null,
        image_urls: imageUrls, comparable_count: comparables.length,
      };
      return jsonResponse({ ok: true, source: 'external', confidence: result.confidence, result, candidates: comparables, result_ids: ids, needs_review: comparables.length < 3 || result.confidence < 0.75, warnings });
    } finally {
      if (tempPath) await db.storage.from('inbound-docs').remove([tempPath]);
    }
  } catch (error) {
    console.error('inbound-identify', error);
    const status = (error as Error & { status?: number }).status;
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Não foi possível consultar as fontes.' }, status && [400, 401, 402, 403, 429].includes(status) ? status : 502);
  }
});
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

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[^0-9,.-]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
    price: parsePrice(row.extracted_price ?? row.price?.value ?? row.price),
    condition: row.condition ?? null,
    confidence: Math.max(0.4, 0.86 - index * 0.035),
    source: text(row.source ?? row.merchant_name, 100) || source,
  }));
}

type VisionResult = {
  title: string;
  brand: string | null;
  category: string | null;
  description: string;
  condition_guess: string | null;
  search_query: string;
  confidence: number;
  reasoning_note: string;
};

const GEMINI_MODEL = 'gemini-3.6-flash';
const NVIDIA_VISION_MODEL = 'meta/llama-3.2-90b-vision-instruct';

function geminiErrorMessage(status: number) {
  if (status === 400) return 'O Gemini não aceitou os dados enviados para análise.';
  if (status === 401 || status === 403) return 'A credencial do Gemini precisa ser verificada.';
  if (status === 429) return 'O Gemini atingiu o limite temporário de consultas.';
  if (status >= 500) return 'O Gemini está temporariamente indisponível.';
  return 'Falha na análise pelo Gemini.';
}

function parseGeminiJson(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return cleaned ? JSON.parse(cleaned) : null;
}

function nvidiaErrorMessage(status: number) {
  if (status === 400) return 'A NVIDIA não aceitou a foto enviada para análise.';
  if (status === 401 || status === 403) return 'A credencial da NVIDIA precisa ser verificada.';
  if (status === 429) return 'A NVIDIA atingiu o limite temporário de consultas.';
  if (status >= 500) return 'A análise visual da NVIDIA está temporariamente indisponível.';
  return 'Falha na análise visual pela NVIDIA.';
}

async function nvidiaVisionJson(prompt: string, imageBase64: string): Promise<VisionResult | null> {
  const key = Deno.env.get('NVIDIA_API_KEY');
  if (!key) return null;
  const match = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error('Formato de imagem não aceito pela NVIDIA.');

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: NVIDIA_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `${prompt}\nRetorne somente JSON válido com: title, brand, category, description, condition_guess, search_query, confidence e reasoning_note.` },
          { type: 'image_url', image_url: { url: `data:${match[1]};base64,${match[2]}` } },
        ],
      }],
      temperature: 0.1,
      max_tokens: 900,
    }),
  });
  if (!response.ok) {
    const providerMessage = await response.text();
    console.error('NVIDIA Scan error', response.status, providerMessage.slice(0, 1200));
    const error = new Error(nvidiaErrorMessage(response.status));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const body = await response.json();
  const raw = body?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('A NVIDIA não retornou uma identificação utilizável.');
  const parsed = parseGeminiJson(raw) as Record<string, unknown> | null;
  if (!parsed || typeof parsed.title !== 'string' || typeof parsed.search_query !== 'string') {
    throw new Error('A NVIDIA retornou uma identificação incompleta.');
  }
  return {
    title: text(parsed.title, 300),
    brand: typeof parsed.brand === 'string' ? text(parsed.brand, 120) || null : null,
    category: typeof parsed.category === 'string' ? text(parsed.category, 120) || null : null,
    description: text(parsed.description, 2000),
    condition_guess: typeof parsed.condition_guess === 'string' ? text(parsed.condition_guess, 120) || null : null,
    search_query: text(parsed.search_query, 180),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
    reasoning_note: text(parsed.reasoning_note, 1000),
  };
}

async function geminiJson(prompt: string, schema: Record<string, unknown>, imageBase64?: string) {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('A API Gemini ainda não foi configurada para o Garimpo Scan.');
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) throw new Error('Formato de imagem não aceito pelo Gemini.');
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 700 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250)));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema },
      }),
    });
    if (response.ok) {
      const body = await response.json();
      const output = body?.candidates?.[0]?.content?.parts
        ?.map((part: Record<string, unknown>) => typeof part.text === 'string' ? part.text : '')
        .join('') ?? '';
      return parseGeminiJson(output);
    }
    const providerMessage = await response.text();
    console.error('Gemini Scan error', response.status, providerMessage.slice(0, 1200));
    const error = new Error(geminiErrorMessage(response.status));
    (error as Error & { status?: number }).status = response.status;
    lastError = error;
    if (response.status !== 429 && response.status < 500) throw error;
  }
  throw lastError ?? new Error('Falha na análise pelo Gemini.');
}

async function analyzeImage(imageBase64: string): Promise<VisionResult | null> {
  const prompt = 'Analise esta foto real de um produto usado para cadastro comercial. Responda em JSON. Identifique somente características visualmente sustentadas. Se marca ou modelo não forem legíveis, use null e não invente. Crie uma busca curta e objetiva em português para encontrar o mesmo produto em anúncios brasileiros. Não forneça dados fiscais.';
  try {
    return await geminiJson(
    prompt,
    {
      type: 'object', additionalProperties: false,
      properties: {
        title: { type: 'string' }, brand: { type: ['string', 'null'] }, category: { type: ['string', 'null'] },
        description: { type: 'string' }, condition_guess: { type: ['string', 'null'] }, search_query: { type: 'string' },
        confidence: { type: 'number' }, reasoning_note: { type: 'string' },
      },
      required: ['title', 'brand', 'category', 'description', 'condition_guess', 'search_query', 'confidence', 'reasoning_note'],
    },
    imageBase64,
    ) as VisionResult | null;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status !== 429 && (!status || status < 500)) throw error;
    const nvidiaResult = await nvidiaVisionJson(prompt, imageBase64);
    if (nvidiaResult) return nvidiaResult;
    throw error;
  }
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

function priceFromPage(html: string) {
  const structured = html.match(/"price"\s*:\s*"?([0-9]+(?:[.,][0-9]{1,2})?)/i)?.[1];
  if (structured) return parsePrice(structured);
  const visible = html.match(/R\$\s*[0-9.]+(?:,[0-9]{2})?/i)?.[0];
  return parsePrice(visible);
}

async function geminiSearchLookup(query: string): Promise<Candidate[]> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key || !query) return [];
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Pesquise anúncios brasileiros atuais de venda deste produto: ${query}. Priorize páginas do produto com preço em reais. Não estime preços e não invente links.` }] }],
      tools: [{ google_search: {} }],
    }),
  });
  if (!response.ok) {
    const providerMessage = await response.text();
    console.error('Gemini Search error', response.status, providerMessage.slice(0, 1200));
    const error = new Error(geminiErrorMessage(response.status));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const body = await response.json();
  const chunks = body?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const candidates: Candidate[] = [];
  for (const chunk of chunks.slice(0, 8)) {
    const url = text(chunk?.web?.uri, 2000);
    const title = text(chunk?.web?.title, 300);
    if (!url || !title) continue;
    try {
      const page = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (!page.ok) continue;
      const html = await page.text();
      const price = priceFromPage(html.slice(0, 500_000));
      if (!price) continue;
      const finalUrl = page.url || url;
      candidates.push({
        title, brand: null, category: null, gtin: null, image_url: null,
        product_url: finalUrl, price, condition: null, confidence: 0.72,
        source: new URL(finalUrl).hostname.replace(/^www\./, ''),
      });
    } catch { /* fonte inacessível ou sem preço verificável */ }
  }
  return candidates;
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

async function synthesize(barcode: string, hint: string, candidates: Candidate[]) {
  if (!candidates.length) return null;
  return geminiJson(
    `Gere JSON de cadastro comercial em português brasileiro usando somente as referências reais abaixo. Compare marca, modelo, condição e preço. Não invente GTIN, marca, categoria fiscal, NCM, CEST, origem, peso ou dimensões. Sugira o preço mais adequado. Código: ${barcode || 'não informado'}. Observação visual: ${hint || 'nenhuma'}. Referências: ${JSON.stringify(candidates)}`,
    {
        type: 'object', additionalProperties: false,
        properties: {
          title: { type: 'string' }, description: { type: 'string' }, brand: { type: ['string','null'] },
          category: { type: ['string','null'] }, condition_guess: { type: ['string','null'] },
          estimated_price_brl: { type: 'number' }, confidence: { type: 'number' }, reasoning_note: { type: 'string' },
        },
        required: ['title','description','brand','category','condition_guess','estimated_price_brl','confidence','reasoning_note'],
    },
  );
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
      let visualResult: VisionResult | null = null;
    let tempPath: string | null = null;
    try {
      if (barcode) {
        try { sourceCandidates.push(...await cosmosLookup(barcode)); } catch (error) { warnings.push(error instanceof Error ? error.message : 'Falha na base GTIN.'); }
        try { sourceCandidates.push(...await serpLookup(new URLSearchParams({ engine: 'google_shopping', q: barcode }))); } catch (error) { warnings.push(error instanceof Error ? error.message : 'Falha ao buscar anúncios pelo código.'); }
      }
      if (imageBase64) {
        try { visualResult = await analyzeImage(imageBase64); }
        catch (error) {
          const status = (error as Error & { status?: number }).status;
          if (status === 402 || status === 403) throw error;
          warnings.push(error instanceof Error ? error.message : 'Falha ao analisar a foto.');
        }
        try {
          const uploaded = await uploadSearchImage(imageBase64, db);
          tempPath = uploaded.path;
          sourceCandidates.push(...await serpLookup(new URLSearchParams({ engine: 'google_lens', url: uploaded.signedUrl })));
        } catch (error) { warnings.push(error instanceof Error ? error.message : 'Falha na busca visual.'); }
      }

      const searchQuery = text(visualResult?.search_query, 180)
        || text(sourceCandidates.find(candidate => candidate.title)?.title, 180);
      if (!barcode && searchQuery) {
        try { sourceCandidates.push(...await serpLookup(new URLSearchParams({ engine: 'google_shopping', q: searchQuery }))); }
        catch {
          try { sourceCandidates.push(...await geminiSearchLookup(searchQuery)); }
          catch (error) { warnings.push(error instanceof Error ? error.message : 'Falha ao buscar preços pelo produto identificado.'); }
        }
      }

      const comparables = selectComparables(sourceCandidates);
      const catalogCandidate = sourceCandidates.find(candidate => candidate.source === 'cosmos') ?? null;
      let aiResult: Record<string, any> | null = null;
      try { aiResult = await synthesize(barcode, visualResult?.description || hint, comparables.length ? comparables : sourceCandidates.slice(0, 3)); }
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
        title: aiResult?.title ?? visualResult?.title ?? catalogCandidate?.title ?? comparables[0]?.title ?? '',
        description: aiResult?.description ?? visualResult?.description ?? null,
        brand: aiResult?.brand ?? visualResult?.brand ?? catalogCandidate?.brand ?? null,
        category: aiResult?.category ?? visualResult?.category ?? catalogCandidate?.category ?? null,
        color: null, size: null,
        condition_guess: aiResult?.condition_guess ?? visualResult?.condition_guess ?? comparables[0]?.condition ?? null,
        estimated_price_brl: Number(aiResult?.estimated_price_brl ?? fallbackPrice ?? 0) || null,
        confidence: Math.max(0, Math.min(1, Number(aiResult?.confidence ?? visualResult?.confidence ?? (comparables.length === 3 ? 0.82 : 0.62)))),
        reasoning_note: aiResult?.reasoning_note ?? visualResult?.reasoning_note ?? 'Sugestão baseada nas referências disponíveis.',
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
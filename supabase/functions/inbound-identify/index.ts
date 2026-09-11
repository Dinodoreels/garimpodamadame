// Identificação automática de produto (Garimpo Scan) via Lovable AI Gateway.
// Recebe código de barras e/ou foto e devolve identificação estruturada + confiança.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-operator-token',
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Nome comercial do produto em português" },
    brand: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    color: { type: ["string", "null"] },
    size: { type: ["string", "null"] },
    condition_guess: { type: ["string", "null"], enum: ["T1", "T2", "O1", "U1", "R1", "D1", null] },
    estimated_price_brl: { type: ["number", "null"] },
    confidence: { type: "number", description: "0 a 1" },
    reasoning_note: { type: ["string", "null"] },
  },
  required: [
    "title", "brand", "category", "description", "color", "size",
    "condition_guess", "estimated_price_brl", "confidence", "reasoning_note",
  ],
};

const SYSTEM = `Você identifica produtos de logística reversa em um centro de distribuição brasileiro.
Receba código de barras (EAN/GTIN) e/ou foto e responda o que o produto é.
Regras:
- Responda sempre em português do Brasil.
- Nunca invente marca ou modelo: se não tiver certeza, use confiança baixa e explique em reasoning_note.
- confidence é de 0 a 1: acima de 0.75 significa que você reconhece o produto com segurança.
- estimated_price_brl é um preço de varejo aproximado no Brasil, ou null.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return json({ ok: false, error: 'IA não configurada no projeto.' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const barcode: string | undefined = body?.barcode?.toString().trim() || undefined;
    const imageBase64: string | undefined = body?.image_base64 || undefined;
    const hint: string | undefined = body?.hint || undefined;

    if (!barcode && !imageBase64) {
      return json({ ok: false, error: 'Informe um código de barras ou uma foto.' }, 400);
    }

    // Antes da IA: se o código já existe no catálogo, reaproveita o SKU criado.
    let match: Record<string, unknown> | null = null;
    if (barcode) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await supabase
        .from('product_variants')
        .select('id, title, sku, barcode, price, cost, product_id, products(id, title, vendor, product_type)')
        .or(`barcode.eq.${barcode},sku.eq.${barcode}`)
        .limit(1)
        .maybeSingle();
      if (data) match = data as Record<string, unknown>;
    }

    if (match) {
      const p = (match.products ?? {}) as Record<string, unknown>;
      return json({
        ok: true,
        source: 'catalog',
        confidence: 1,
        match: {
          product_id: match.product_id,
          variant_id: match.id,
          sku: match.sku,
          title: p.title ?? match.title,
          brand: p.vendor ?? null,
          category: p.product_type ?? null,
          price: match.price ?? null,
          cost: match.cost ?? null,
        },
      });
    }

    const content: Record<string, unknown>[] = [{
      type: 'input_text',
      text: [
        barcode ? `Código de barras lido: ${barcode}` : 'Sem código de barras legível.',
        hint ? `Observação do operador: ${hint}` : '',
        'Identifique o produto.',
      ].filter(Boolean).join('\n'),
    }];
    if (imageBase64) {
      content.push({ type: 'input_image', image_url: imageBase64 });
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        instructions: SYSTEM,
        input: [{ role: 'user', content }],
        stream: true,
        reasoning: { effort: 'low' },
        text: {
          format: {
            type: 'json_schema',
            name: 'product_identification',
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      return json({ ok: false, status: res.status, error: gatewayMessage(res.status, detail) }, res.status === 429 ? 429 : 502);
    }

    const text = await readStream(res.body);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ ok: false, error: 'A IA não devolveu um resultado válido. Cadastre manualmente.' }, 502);
    }

    return json({ ok: true, source: 'ai', confidence: Number(parsed.confidence ?? 0), result: parsed });
  } catch (e) {
    console.error('inbound-identify error', e);
    return json({ ok: false, error: 'Falha ao identificar o produto. Tente de novo ou cadastre manualmente.' }, 500);
  }
});

async function readStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let out = '';
  let completed = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
          out += evt.delta;
        } else if (evt.type === 'response.completed') {
          const arr = evt.response?.output ?? [];
          for (const item of arr) {
            for (const c of item?.content ?? []) {
              if (typeof c?.text === 'string') completed += c.text;
            }
          }
        }
      } catch {
        // ignora eventos parciais
      }
    }
  }
  return (out || completed).trim();
}

function gatewayMessage(status: number, detail: string) {
  if (status === 402) return 'Os créditos de IA acabaram. Adicione créditos para voltar a identificar automaticamente.';
  if (status === 403) return 'A IA está bloqueada nas configurações do espaço de trabalho.';
  if (status === 429) return 'Muitas identificações ao mesmo tempo. Aguarde alguns segundos.';
  return `A IA não respondeu (${status}). Cadastre manualmente. ${detail.slice(0, 180)}`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

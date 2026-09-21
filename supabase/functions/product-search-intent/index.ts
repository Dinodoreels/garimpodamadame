import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id',
};

function parseSseText(raw: string) {
  let output = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const event = JSON.parse(line.slice(6));
      if (event.type === 'response.output_text.delta') output += event.delta ?? '';
      if (event.type === 'response.completed' && !output) output = event.response?.output_text ?? '';
    } catch {
      // Ignore non-JSON keep-alive lines.
    }
  }
  return output;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await request.json();
    if (typeof query !== 'string' || query.trim().length < 2 || query.length > 160) {
      return Response.json({ error: 'Pesquisa inválida.' }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return Response.json({ error: 'Pesquisa inteligente não configurada.' }, { status: 401, headers: corsHeaders });

    const gatewayResponse = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'fetch',
        ...(request.headers.get('X-Lovable-AIG-Run-ID') ? { 'X-Lovable-AIG-Run-ID': request.headers.get('X-Lovable-AIG-Run-ID') as string } : {}),
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        stream: true,
        reasoning: { effort: 'low', summary: 'auto' },
        include: ['reasoning.encrypted_content'],
        input: [{
          role: 'user',
          content: [{ type: 'input_text', text: `Interprete esta pesquisa de uma loja brasileira sem inventar produtos: "${query.trim()}". Extraia apenas termos úteis de produto, marca, categoria, característica, SKU ou código. Ignore palavras de ligação. Identifique preço mínimo/máximo e se exige disponibilidade. Responda somente no formato JSON solicitado.` }],
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'product_search_intent',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['terms', 'minPrice', 'maxPrice', 'onlyAvailable'],
              properties: {
                terms: { type: 'array', items: { type: 'string' } },
                minPrice: { type: ['number', 'null'] },
                maxPrice: { type: ['number', 'null'] },
                onlyAvailable: { type: 'boolean' },
              },
            },
          },
        },
      }),
    });

    const safeMessage = await gatewayResponse.text();
    if (!gatewayResponse.ok) {
      let message = 'Não foi possível interpretar a pesquisa agora.';
      try { message = JSON.parse(safeMessage)?.message ?? message; } catch { /* keep safe fallback */ }
      return Response.json({ error: message }, { status: gatewayResponse.status, headers: corsHeaders });
    }

    const text = parseSseText(safeMessage);
    const intent = JSON.parse(text);
    const headers = new Headers({ ...corsHeaders, 'Content-Type': 'application/json' });
    const runId = gatewayResponse.headers.get('X-Lovable-AIG-Run-ID');
    if (runId) {
      headers.set('X-Lovable-AIG-Run-ID', runId);
      headers.set('Access-Control-Expose-Headers', 'X-Lovable-AIG-Run-ID');
    }
    return new Response(JSON.stringify({ intent }), { headers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Não foi possível interpretar a pesquisa.' },
      { status: 500, headers: corsHeaders },
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_SYSTEM_PROMPT = `Você é o assistente virtual da loja — simpático, prestativo e resolutivo.

## O que você sabe fazer

### 🛍️ Produtos & Recomendações
- Recomende produtos do catálogo com links: [Nome do Produto](/product/handle)
- Sugira alternativas quando esgotado, ajude com tamanhos e materiais

### 📦 Pedidos & Rastreamento
- Informe status, código de rastreio e previsão de entrega
- Prazos: SP capital 3-5d, capitais 5-8d, interior 8-12d

### 🔄 Trocas & Devoluções
- Prazo: 7 dias após recebimento, produto sem uso, com etiqueta
- Reembolso: estorno em até 10 dias úteis

### 💳 Pagamento
- PIX (instantâneo), cartão (até 12x), boleto (3 dias úteis)

### 🏆 Programa de Fidelidade
- Explique como acumular e resgatar pontos

### 🎟️ Cupons
- Como aplicar, validade e restrições

### 🏪 Lojas Físicas
- Endereço, telefone e horário quando perguntado

### 📞 Escalonamento
- Se não resolver em 3 mensagens → sugira WhatsApp

## Tom & Formato
- Português brasileiro, amigável, conciso
- Links: [Nome](/product/handle)
- Emojis moderados (1-2 por mensagem)`;

async function callProvider(engine: string, apiKey: string, model: string, messages: any[], stream: boolean) {
  if (!engine || engine === 'builtin') {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');
    return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream }),
    });
  }
  if (!apiKey) throw new Error('API Key do provedor não configurada');
  if (engine === 'openai' || engine === 'deepseek' || engine === 'groq') {
    const urls: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      groq: 'https://api.groq.com/openai/v1/chat/completions',
    };
    return fetch(urls[engine], {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream }),
    });
  }
  if (engine === 'mistral') {
    return fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream }),
    });
  }
  if (engine === 'cohere') {
    return fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream }),
    });
  }
  if (engine === 'anthropic') {
    const sys = messages.find((m: any) => m.role === 'system');
    const rest = messages.filter((m: any) => m.role !== 'system');
    const body: any = { model, max_tokens: 4096, messages: rest, stream };
    if (sys) body.system = sys.content;
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  if (engine === 'google') {
    const sys = messages.find((m: any) => m.role === 'system');
    const contents = messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
    }));
    const body: any = { contents };
    if (sys) body.systemInstruction = { parts: [{ text: sys.content }] };
    const method = stream ? 'streamGenerateContent' : 'generateContent';
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  throw new Error(`Provedor desconhecido: ${engine}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    let model = 'google/gemini-3-flash-preview';
    let engine = 'builtin';
    let apiKey = '';

    const { data: aiConfig } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'ai_config')
      .maybeSingle();

    if (aiConfig?.value) {
      const val = aiConfig.value as any;
      if (val.engine) engine = val.engine;
      if (val.api_key) apiKey = val.api_key;
      const cfg = val.customer_support;
      if (cfg?.prompt) systemPrompt = cfg.prompt;
      if (cfg?.model) model = cfg.model;
    }

    // Load product catalog for context
    const { data: products } = await supabase
      .from('products')
      .select('title, handle, price, product_type, is_available')
      .eq('status', 'active')
      .eq('is_available', true)
      .limit(50);

    let catalogContext = '';
    if (products?.length) {
      catalogContext = `\n\n📦 CATÁLOGO DISPONÍVEL:\n${products.map(p =>
        `- ${p.title} (${p.product_type || 'Geral'}) - R$ ${Number(p.price).toFixed(2)} → /product/${p.handle}`
      ).join('\n')}`;
    }

    const fullPrompt = systemPrompt + catalogContext;

    const response = await callProvider(engine, apiKey, model, [
      { role: 'system', content: fullPrompt },
      ...messages,
    ], true);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas mensagens. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Serviço temporariamente indisponível.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const text = await response.text();
      console.error('Customer support chat error:', response.status, text);
      throw new Error('Erro ao comunicar com a IA');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Customer support chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_SYSTEM_PROMPT = `Você é um copywriter e especialista em SEO para e-commerce de moda e streetwear brasileiro.

## Suas Competências

### ✍️ Títulos SEO
- 60-70 caracteres, estrutura: Marca + Tipo + Diferencial + Cor/Material

### 📝 Descrições
- Curta (AIDA, 2-3 linhas) e longa (composição, lavagem, modelagem, ocasião)
- Máximo 150 palavras, tom jovem e aspiracional

### 🏷️ Tags & Keywords
- 5-10 tags: marca, tipo, material, estilo, ocasião, cor, gênero

### 📐 Especificações
- Peso (gramas), dimensões (cm), cores, tamanhos

### 💲 Precificação
- Sugestão baseada em posicionamento: entrada, médio, premium

### 📊 Variantes
- Grade: PP a XGG ou 36-46, cores com nome comercial

## Diretrizes
- Português brasileiro, público jovem (18-35 anos)
- Emojis moderados, JSON válido quando solicitado
- Categorias: CALCADOS, ROUPAS, CAMISAS, CAMISETAS, SHORTS, CALCAS, VESTIDOS, JAQUETAS, MOLETONS, ACESSORIOS, ESPORTIVO, BONES, BOLSAS, CONJUNTO, OUTROS`;

async function callProvider(engine: string, apiKey: string, model: string, messages: any[], opts?: { jsonMode?: boolean }) {
  const hasImage = messages.some((m: any) =>
    Array.isArray(m.content) && m.content.some((c: any) => c?.type === 'image_url')
  );

  if (!engine || engine === 'builtin') {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');
    let resolvedModel = model;
    // Force a vision-capable model when an image is present
    if (hasImage && /flash-lite|nano/i.test(resolvedModel)) {
      resolvedModel = 'google/gemini-2.5-flash';
    }
    const body: any = { model: resolvedModel, messages };
    if (opts?.jsonMode) body.response_format = { type: 'json_object' };
    return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  if (!apiKey) throw new Error('API Key do provedor não configurada');
  if (engine === 'openai' || engine === 'deepseek' || engine === 'groq') {
    const urls: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      groq: 'https://api.groq.com/openai/v1/chat/completions',
    };
    const body: any = { model, messages };
    if (opts?.jsonMode) body.response_format = { type: 'json_object' };
    return fetch(urls[engine], {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  if (engine === 'mistral') {
    return fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages }),
    });
  }
  if (engine === 'cohere') {
    return fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages }),
    });
  }
  if (engine === 'anthropic') {
    const sys = messages.find((m: any) => m.role === 'system');
    const rest = messages.filter((m: any) => m.role !== 'system');
    const body: any = { model, max_tokens: 4096, messages: rest };
    if (sys) body.system = typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content);
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
      parts: Array.isArray(m.content)
        ? m.content.map((c: any) => {
            if (c.type !== 'image_url') return { text: c.text };
            const url: string = c.image_url.url || '';
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            return match
              ? { inlineData: { mimeType: match[1], data: match[2] } }
              : { inlineData: { mimeType: 'image/jpeg', data: url.split(',').pop() || '' } };
          })
        : [{ text: m.content }],
    }));
    const body: any = { contents };
    if (sys) body.systemInstruction = { parts: [{ text: typeof sys.content === 'string' ? sys.content : JSON.stringify(sys.content) }] };
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  throw new Error(`Provedor desconhecido: ${engine}`);
}

async function extractContent(response: Response, engine: string): Promise<string> {
  const data = await response.json();
  if (!engine || engine === 'builtin' || engine === 'openai' || engine === 'deepseek' || engine === 'groq' || engine === 'mistral') {
    return data.choices?.[0]?.message?.content || '';
  }
  if (engine === 'anthropic') {
    return data.content?.[0]?.text || '';
  }
  if (engine === 'google') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  if (engine === 'cohere') {
    return data.message?.content?.[0]?.text || '';
  }
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, title, type, vendor, description, imageBase64, imageMime } = await req.json();
    const mimeType = imageMime || 'image/jpeg';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    let model = 'google/gemini-2.5-flash';
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
      const cfg = val.product;
      if (cfg?.prompt) systemPrompt = cfg.prompt;
      if (cfg?.model) model = cfg.model;
    }

    let result: any = {};

    const callAI = async (msgs: any[], opts?: { jsonMode?: boolean }) => {
      const resp = await callProvider(engine, apiKey, model, msgs, opts);
      if (!resp.ok) {
        if (resp.status === 429) throw new Error('Rate limit exceeded. Tente novamente em alguns segundos.');
        if (resp.status === 402) throw new Error('Créditos de IA esgotados.');
        const text = await resp.text();
        console.error('Product AI error:', resp.status, text);
        throw new Error('Erro ao comunicar com a IA');
      }
      return extractContent(resp, engine);
    };

    // Tolerant JSON parser: tries direct parse, then strips markdown, then regex-isolates first object
    const tryParseJson = (raw: string): any | null => {
      if (!raw) return null;
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch {}
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch {} }
      return null;
    };

    switch (action) {
      case 'generateDescription': {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crie uma descrição profissional para:\n\nTítulo: ${title}\nTipo: ${type || 'N/A'}\nMarca: ${vendor || 'N/A'}\n\nRetorne APENAS a descrição.` }
        ];
        result.description = await callAI(messages);
        break;
      }

      case 'generateTags': {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Gere tags SEO para:\n\nTítulo: ${title}\nTipo: ${type || 'N/A'}\nDescrição: ${description || 'N/A'}\nMarca: ${vendor || 'N/A'}\n\nRetorne APENAS as tags separadas por vírgula.` }
        ];
        result.tags = await callAI(messages);
        break;
      }

      case 'researchProduct': {
        const messages = [
          { role: 'system', content: `Você é um pesquisador de produtos de moda/streetwear. Pesquise informações do produto e retorne dados realistas.\n\nRetorne um JSON válido com:\n- price: preço sugerido em reais (número)\n- colors: array de cores disponíveis (ex: ["Preto", "Branco"])\n- description: descrição profissional do produto (máximo 150 palavras)\n- tags: tags SEO separadas por vírgula\n- weight_grams: peso estimado em gramas (número)\n- length_cm: comprimento em cm (número)\n- width_cm: largura em cm (número)\n- height_cm: altura em cm (número)\n- sizes: array de tamanhos disponíveis (ex: ["P", "M", "G"] ou ["38", "39", "40"])\n- type: tipo do produto (CALCADOS, ROUPAS, CAMISAS, CAMISETAS, SHORTS, CALCAS, VESTIDOS, JAQUETAS, MOLETONS, ACESSORIOS, ESPORTIVO, BONES, BOLSAS, CONJUNTO, OUTROS)\n\nRetorne APENAS o JSON válido, sem markdown.` },
          { role: 'user', content: `Pesquise e retorne informações completas sobre este produto:\n\nTítulo: ${title}\nMarca: ${vendor || 'Não especificada'}\nTipo: ${type || 'Não especificado'}` }
        ];
        const response = await callAI(messages, { jsonMode: true });
        const parsed = tryParseJson(response);
        result = parsed ?? { error: 'parse_failed', rawAnalysis: response?.slice(0, 500) };
        break;
      }

      case 'analyzeImage': {
        if (!imageBase64) throw new Error('Imagem não fornecida');
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: `Analise esta imagem e retorne JSON com: title, type, description, tags.\nRetorne APENAS o JSON válido.` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
          ]}
        ];
        const response = await callAI(messages, { jsonMode: true });
        const parsed = tryParseJson(response);
        result = parsed ?? { error: 'parse_failed', rawAnalysis: response?.slice(0, 500) };
        break;
      }

      case 'autoFill': {
        const messages: any[] = [{ role: 'system', content: systemPrompt }];
        const prompt = `Para o produto:\nTítulo: ${title || 'A definir'}\nTipo: ${type || 'N/A'}\nMarca: ${vendor || 'N/A'}`;

        if (imageBase64) {
          messages.push({ role: 'user', content: [
            { type: 'text', text: `Analise esta imagem e ${prompt}\n\nRetorne JSON com: title, type, description, tags, weight_grams, length_cm, width_cm, height_cm.\nRetorne APENAS o JSON válido.` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
          ]});
        } else {
          messages.push({ role: 'user', content: `${prompt}\n\nRetorne JSON com: description, tags.\nRetorne APENAS o JSON válido.` });
        }

        const response = await callAI(messages, { jsonMode: true });
        console.log('autoFill raw response (first 300 chars):', response?.slice(0, 300));
        const parsed = tryParseJson(response);
        if (parsed) {
          result = parsed;
        } else {
          result = { error: 'Não foi possível processar a resposta da IA', rawAnalysis: response?.slice(0, 500) };
        }
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Product AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

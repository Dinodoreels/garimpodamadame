import { requireInternalOrAdmin } from '../_shared/internal-auth.ts'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_SYSTEM_PROMPT = `Você é um consultor estratégico de e-commerce especializado em moda e streetwear. Você atua como braço direito do gestor, com acesso completo aos dados operacionais da loja.

## Suas Competências

### 📊 Análise de Vendas & Métricas
- Ticket médio, AOV, taxa de conversão, receita por período
- Comparação entre períodos, sazonalidade, curva ABC, slow movers
- Funil de conversão: visitantes → carrinho → checkout → pagamento → entrega

### 🏪 Gestão Multi-Loja
- Comparativo entre lojas físicas e canal online
- Estoque por loja, performance de funcionários e vendedores

### 💰 Financeiro
- DRE simplificado, margem de contribuição, fluxo de caixa
- Relatório de fechamento por período e por loja, análise de despesas

### 👥 CRM & Fidelidade
- LTV, churn, cohort, taxa de recompra, programa de fidelidade
- Segmentação RFM, análise de cupons e promoções

### 📦 Logística & Devoluções
- SLA de entrega, custo de frete, taxa de devolução/reembolso

### 📣 Marketing
- ROI de campanhas (Meta/GA4/TikTok/GTM), banners, carrinho abandonado

## Formato de Resposta
- Use **negrito** para métricas importantes
- Priorize ações: 🔴 Alta | 🟡 Média | 🟢 Baixa
- Alerte anomalias com ⚠️
- Use dados reais do contexto fornecido
- Responda em português brasileiro
- Seja objetivo: dados → insight → ação recomendada`;

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

  const access = await requireInternalOrAdmin(req)
  if (access instanceof Response) return new Response(access.body, { status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const { messages, context } = await req.json();

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
      const cfg = val.admin;
      if (cfg?.prompt) systemPrompt = cfg.prompt;
      if (cfg?.model) model = cfg.model;
    }

    let contextMessage = '';
    if (context) {
      contextMessage = `\n\n📊 DADOS ATUAIS DA LOJA:
${context.stats ? `
- Total de Pedidos: ${context.stats.totalOrders}
- Receita Total: R$ ${context.stats.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Total de Clientes: ${context.stats.totalCustomers}
- Pedidos Pendentes: ${context.stats.pendingOrders}
` : ''}
${context.recentOrders ? `- Últimos pedidos: ${context.recentOrders.length} registros disponíveis` : ''}
${context.productCount ? `- Total de Produtos: ${context.productCount}` : ''}
`;
    }

    const systemWithContext = systemPrompt + contextMessage;

    const response = await callProvider(engine, apiKey, model, [
      { role: 'system', content: systemWithContext },
      ...messages
    ], true);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Adicione mais créditos para continuar.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const text = await response.text();
      console.error('Admin AI Chat error:', response.status, text);
      throw new Error('Erro ao comunicar com a IA');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Admin AI Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

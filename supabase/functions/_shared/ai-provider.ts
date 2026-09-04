// Shared AI provider routing for edge functions

export type EngineType = 'builtin' | 'openai' | 'google' | 'anthropic' | 'deepseek';

interface AIProviderConfig {
  engine: EngineType;
  apiKey: string;
  model: string;
  messages: { role: string; content: any }[];
  stream?: boolean;
}

export async function callAIProvider(config: AIProviderConfig): Promise<Response> {
  const { engine, apiKey, model, messages, stream = false } = config;

  if (engine === 'builtin' || !engine) {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');
    return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, stream }),
    });
  }

  if (!apiKey) throw new Error('API Key do provedor não configurada');

  switch (engine) {
    case 'openai':
    case 'deepseek': {
      const baseUrl = engine === 'deepseek'
        ? 'https://api.deepseek.com/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      return fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, stream }),
      });
    }

    case 'anthropic': {
      const systemMsg = messages.find(m => m.role === 'system');
      const nonSystemMsgs = messages.filter(m => m.role !== 'system');
      const body: any = {
        model,
        max_tokens: 4096,
        messages: nonSystemMsgs,
      };
      if (systemMsg) body.system = typeof systemMsg.content === 'string' ? systemMsg.content : JSON.stringify(systemMsg.content);
      if (stream) body.stream = true;
      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }

    case 'google': {
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
        }));
      const systemInstruction = messages.find(m => m.role === 'system');
      const body: any = { contents };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: typeof systemInstruction.content === 'string' ? systemInstruction.content : JSON.stringify(systemInstruction.content) }] };
      }
      const method = stream ? 'streamGenerateContent' : 'generateContent';
      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    default:
      throw new Error(`Provedor desconhecido: ${engine}`);
  }
}

export async function getAIConfig(supabase: any) {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'ai_config')
    .maybeSingle();
  return data?.value || null;
}

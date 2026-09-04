import { useState, useEffect } from 'react';
import { Sparkles, Bot, ShoppingBag, MessageCircle, Save, Loader2, RotateCcw, Eye, EyeOff, Cpu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSiteContent } from '@/hooks/useSiteContent';

type EngineType = 'builtin' | 'openai' | 'google' | 'anthropic' | 'deepseek' | 'mistral' | 'groq' | 'cohere';

const ENGINE_OPTIONS: { value: EngineType; label: string; description: string }[] = [
  { value: 'builtin', label: 'IA Integrada', description: 'Sem configuração necessária' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-4o, GPT-4 Turbo' },
  { value: 'google', label: 'Google AI', description: 'Gemini 2.5, 2.0' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude Sonnet, Haiku' },
  { value: 'deepseek', label: 'DeepSeek', description: 'Chat, Reasoner' },
  { value: 'mistral', label: 'Mistral', description: 'Large, Medium, Small' },
  { value: 'groq', label: 'Groq', description: 'LLaMA, Mixtral (Ultra rápido)' },
  { value: 'cohere', label: 'Cohere', description: 'Command R+, Command R' },
];

const MODELS_BY_ENGINE: Record<EngineType, { value: string; label: string; group?: string }[]> = {
  builtin: [
    { value: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', group: 'Google' },
    { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido)', group: 'Google' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)', group: 'Google' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanceado)', group: 'Google' },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Econômico)', group: 'Google' },
    { value: 'openai/gpt-5.2', label: 'GPT-5.2 (Último)', group: 'OpenAI' },
    { value: 'openai/gpt-5', label: 'GPT-5 (Premium)', group: 'OpenAI' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Intermediário)', group: 'OpenAI' },
    { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano (Econômico)', group: 'OpenAI' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  google: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    { value: 'mistral-small-latest', label: 'Mistral Small' },
    { value: 'open-mixtral-8x22b', label: 'Mixtral 8x22B' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B' },
    { value: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B (Rápido)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ],
  cohere: [
    { value: 'command-r-plus', label: 'Command R+ (Avançado)' },
    { value: 'command-r', label: 'Command R' },
    { value: 'command-light', label: 'Command Light (Rápido)' },
  ],
};

const DEFAULT_PROMPTS = {
  admin: `Você é um consultor estratégico de e-commerce especializado em moda e streetwear. Você atua como braço direito do gestor, com acesso completo aos dados operacionais da loja.

## Suas Competências

### 📊 Análise de Vendas & Métricas
- Ticket médio, AOV, taxa de conversão, receita por período
- Comparação entre períodos (dia/semana/mês/ano), identificação de sazonalidade
- Ranking de produtos mais vendidos (curva ABC), produtos parados (slow movers)
- Funil de conversão: visitantes → carrinho → checkout → pagamento → entrega

### 🏪 Gestão Multi-Loja
- Comparativo de performance entre lojas físicas e canal online
- Análise de estoque por loja (ruptura, excesso, necessidade de transferência)
- Performance de funcionários e vendedores por loja
- Sugestão de mix de produtos por região/perfil da loja

### 💰 Financeiro
- DRE simplificado: receita bruta, descontos, frete, custo de mercadoria, despesas operacionais, lucro líquido
- Margem de contribuição por produto e por categoria
- Fluxo de caixa: entradas (vendas) vs saídas (despesas, reembolsos)
- Relatório de fechamento de caixa por período e por loja
- Análise de despesas por categoria (marketing, logística, operacional)

### 👥 CRM & Fidelidade
- Lifetime Value (LTV), taxa de churn, análise de cohort
- Taxa de recompra, frequência de compra, recência
- Programa de fidelidade: pontos acumulados, resgatados, taxa de engajamento
- Segmentação RFM (Recência, Frequência, Valor Monetário)
- Análise de cupons: utilização, impacto na receita, ROI

### 📦 Logística & Devoluções
- SLA de entrega por região e transportadora
- Custo de frete médio por pedido, taxa de frete grátis
- Taxa de devolução/reembolso, principais motivos, impacto financeiro
- Performance de rastreamento e índice de atraso

### 📣 Marketing & Aquisição
- ROI de campanhas (vinculado a UTM/pixels Meta/GA4/TikTok/GTM)
- Performance de banners e promoções
- Carrinho abandonado: taxa, valor médio, eficácia de recuperação

### 🎨 CMS & Site
- Sugestões de otimização para páginas customizadas
- SEO: títulos, meta descriptions, estrutura de conteúdo
- Performance de páginas (views, bounce rate)

## Formato de Resposta
- Use **negrito** para métricas e valores importantes
- Priorize ações: 🔴 Alta | 🟡 Média | 🟢 Baixa prioridade
- Quando detectar anomalias (queda brusca, pico inesperado), alerte com ⚠️
- Sempre use dados reais do contexto fornecido
- Responda em português brasileiro
- Use emojis moderadamente para organização visual
- Seja objetivo: dados → insight → ação recomendada`,

  product: `Você é um copywriter e especialista em SEO para e-commerce de moda e streetwear brasileiro. Sua missão é criar conteúdo que vende e ranqueia.

## Suas Competências

### ✍️ Títulos SEO
- Otimizados para busca (60-70 caracteres)
- Estrutura: Marca + Tipo + Diferencial + Cor/Material quando relevante
- Exemplos: "Camiseta Nike Sportswear Essentials Algodão Premium Preta"

### 📝 Descrições de Produto
- **Descrição curta** (2-3 linhas): Técnica AIDA — Atenção, Interesse, Desejo, Ação
- **Descrição longa**: Composição de material, cuidados de lavagem, modelagem (regular/slim/oversized), ocasião de uso, diferenciais do produto
- Máximo 150 palavras por descrição
- Tom: jovem, moderno, aspiracional, adequado ao público streetwear/moda urbana

### 🏷️ Tags & Keywords
- 5-10 tags relevantes por produto para busca interna e SEO
- Incluir: marca, tipo, material, estilo, ocasião, cor, gênero
- Formato: palavras-chave separadas por vírgula

### 📐 Especificações Técnicas
- Peso estimado em gramas
- Dimensões de embalagem (largura × altura × comprimento em cm)
- Tabela de medidas quando aplicável
- Cores disponíveis com nomes comerciais

### 💲 Precificação
- Sugestão baseada em posicionamento: entrada, médio, premium
- Considerar marca, material, categoria e mercado brasileiro
- Preço de comparação (de/por) quando relevante

### 🔍 Pesquisa de Produto (action=researchProduct)
- Buscar referências de mercado para auto-preencher especificações
- Retornar JSON com: price, colors, description, tags, weight_grams, dimensions, sizes, type
- Categorias: CALCADOS, ROUPAS, CAMISAS, CAMISETAS, SHORTS, CALCAS, VESTIDOS, JAQUETAS, MOLETONS, ACESSORIOS, ESPORTIVO, BONES, BOLSAS, CONJUNTO, OUTROS

### 📊 Variantes
- Gerar grade de tamanhos (PP, P, M, G, GG, XGG) ou numéricos (36-46)
- Sugerir cores com nome comercial
- Estoque sugerido por loja física quando aplicável

## Diretrizes
- Sempre responda em português brasileiro
- Foque no público jovem (18-35 anos) e moderno
- Use emojis moderadamente para destacar pontos
- Retorne JSON válido quando solicitado (sem markdown wrapping)`,

  customer_support: `Você é o assistente virtual da loja — simpático, prestativo e resolutivo. Seu objetivo é ajudar o cliente a encontrar o que precisa e resolver problemas rapidamente.

## O que você sabe fazer

### 🛍️ Produtos & Recomendações
- Recomende produtos do catálogo com links clicáveis: [Nome do Produto](/product/handle)
- Sugira alternativas quando um produto estiver esgotado
- Informe sobre tamanhos, materiais, cuidados com as peças
- Ajude o cliente a escolher com base em estilo, ocasião ou preferência

### 📦 Pedidos & Rastreamento
- Informe o status atual do pedido quando o cliente fornecer o número
- Forneça o código de rastreio e link quando disponível
- Previsões de entrega por região:
  - São Paulo capital: 3-5 dias úteis
  - Outras capitais: 5-8 dias úteis
  - Interior: 8-12 dias úteis
- Explique os status: pendente → pago → enviado → entregue

### 🔄 Trocas & Devoluções
- Prazo: 7 dias após o recebimento
- Condições: produto sem uso, com etiqueta, embalagem original
- Processo: 1) Solicitar troca → 2) Enviar produto de volta → 3) Receber novo produto ou reembolso
- Reembolso: estorno em até 10 dias úteis após análise

### 💳 Pagamento
- PIX: aprovação instantânea (desconto pode ser aplicável)
- Cartão de crédito: parcelamento disponível (até 12x)
- Boleto bancário: compensação em até 3 dias úteis

### 🏆 Programa de Fidelidade
- Explique como acumular pontos (compras geram pontos automaticamente)
- Informe como resgatar pontos como desconto no carrinho

### 🎟️ Cupons de Desconto
- Explique como aplicar cupons no carrinho
- Informe sobre validade e restrições (valor mínimo, categorias)

### 💰 Reembolsos
- Informe o status de reembolsos em andamento
- Prazo de estorno: PIX 1-3 dias, cartão 5-10 dias, boleto 10-15 dias

### 🏪 Lojas Físicas
- Informe endereço, telefone e horário quando o cliente perguntar

### 📞 Escalonamento
- Se não conseguir resolver em 3 mensagens, sugira contato via WhatsApp

## Formato & Tom
- Sempre responda em português brasileiro
- Seja amigável e profissional
- Use emojis com moderação (1-2 por mensagem)
- Seja conciso e direto
- Formate produtos como links: [Nome do Produto](/product/handle)
- Use markdown para organizar informações`,
};

interface AIConfig {
  engine: EngineType;
  api_key: string;
  admin: { enabled: boolean; model: string; prompt: string };
  product: { enabled: boolean; model: string; prompt: string };
  customer_support: {
    enabled: boolean;
    model: string;
    prompt: string;
    welcome_message: string;
    quick_questions: string[];
  };
}

const defaultConfig: AIConfig = {
  engine: 'builtin',
  api_key: '',
  admin: { enabled: true, model: 'google/gemini-2.5-flash', prompt: DEFAULT_PROMPTS.admin },
  product: { enabled: true, model: 'google/gemini-2.5-flash', prompt: DEFAULT_PROMPTS.product },
  customer_support: {
    enabled: false,
    model: 'google/gemini-3-flash-preview',
    prompt: DEFAULT_PROMPTS.customer_support,
    welcome_message: 'Olá! 👋 Como posso te ajudar hoje?',
    quick_questions: [
      'Me recomende um produto',
      'Qual o prazo de entrega?',
      'Como funciona a troca?',
    ],
  },
};

export function AITab() {
  const { data, isLoading, save, saving } = useSiteContent<AIConfig>('ai_config');
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (data) {
      setConfig({
        engine: data.engine || 'builtin',
        api_key: data.api_key || '',
        admin: { ...defaultConfig.admin, ...data.admin },
        product: { ...defaultConfig.product, ...data.product },
        customer_support: { ...defaultConfig.customer_support, ...data.customer_support },
      });
    }
  }, [data]);

  const updateAI = (key: keyof AIConfig, field: string, value: any) => {
    if (key === 'engine' || key === 'api_key') return;
    setConfig(prev => ({
      ...prev,
      [key]: { ...(prev[key] as any), [field]: value },
    }));
  };

  const setEngine = (engine: EngineType) => {
    const models = MODELS_BY_ENGINE[engine];
    const defaultModel = models[0]?.value || '';
    setConfig(prev => ({
      ...prev,
      engine,
      api_key: engine === 'builtin' ? '' : prev.api_key,
      admin: { ...prev.admin, model: defaultModel },
      product: { ...prev.product, model: defaultModel },
      customer_support: { ...prev.customer_support, model: defaultModel },
    }));
  };

  const resetPrompt = (key: 'admin' | 'product' | 'customer_support') => {
    updateAI(key, 'prompt', DEFAULT_PROMPTS[key]);
  };

  const currentModels = MODELS_BY_ENGINE[config.engine] || [];
  const hasGroups = currentModels.some(m => m.group);
  const groupedModels = hasGroups
    ? currentModels.reduce((acc, m) => {
        const g = m.group || 'Outros';
        if (!acc[g]) acc[g] = [];
        acc[g].push(m);
        return acc;
      }, {} as Record<string, typeof currentModels>)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const aiCards = [
    {
      key: 'admin' as const,
      icon: Bot,
      title: 'Assistente Admin',
      description: 'IA que auxilia na gestão da loja no painel administrativo',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'product' as const,
      icon: ShoppingBag,
      title: 'Assistente de Produtos',
      description: 'Gera descrições, tags e pesquisa informações de produtos',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      key: 'customer_support' as const,
      icon: MessageCircle,
      title: 'Suporte ao Cliente',
      description: 'Chatbot na loja para atendimento e recomendação de produtos',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  const renderModelSelect = (key: 'admin' | 'product' | 'customer_support') => (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Modelo de IA</Label>
      <Select
        value={config[key].model}
        onValueChange={(v) => updateAI(key, 'model', v)}
      >
        <SelectTrigger className="font-light">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groupedModels
            ? Object.entries(groupedModels).map(([group, models]) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectGroup>
              ))
            : currentModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))
          }
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Engine Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Cpu className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Motor de IA</CardTitle>
              <CardDescription className="text-xs">
                Escolha o provedor de IA ou use a integrada sem configuração
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {ENGINE_OPTIONS.map((eng) => (
              <button
                key={eng.value}
                type="button"
                onClick={() => setEngine(eng.value)}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center ${
                  config.engine === eng.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                {config.engine === eng.value && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
                <span className="text-sm font-medium">{eng.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{eng.description}</span>
              </button>
            ))}
          </div>

          {config.engine !== 'builtin' && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-medium">
                API Key ({ENGINE_OPTIONS.find(e => e.value === config.engine)?.label})
              </Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.api_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder={
                    config.engine === 'openai' ? 'sk-...' :
                    config.engine === 'anthropic' ? 'sk-ant-...' :
                    config.engine === 'deepseek' ? 'sk-...' :
                    'AIza...'
                  }
                  className="pr-10 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                A chave é salva de forma segura e acessada apenas pelo servidor.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Module Cards */}
      {aiCards.map(({ key, icon: Icon, title, description, color, bgColor }) => (
        <Card key={key}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bgColor}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">{title}</CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </div>
              </div>
              <Switch
                checked={config[key].enabled}
                onCheckedChange={(v) => updateAI(key, 'enabled', v)}
              />
            </div>
          </CardHeader>
          {config[key].enabled && (
            <CardContent className="space-y-4">
              {renderModelSelect(key)}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Prompt do Sistema</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => resetPrompt(key)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restaurar Padrão
                  </Button>
                </div>
                <Textarea
                  value={config[key].prompt}
                  onChange={(e) => updateAI(key, 'prompt', e.target.value)}
                  rows={6}
                  className="font-light text-xs"
                />
              </div>

              {key === 'customer_support' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mensagem de Boas-vindas</Label>
                    <Input
                      value={(config.customer_support as any).welcome_message || ''}
                      onChange={(e) => updateAI('customer_support', 'welcome_message', e.target.value)}
                      className="font-light"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Perguntas Rápidas (uma por linha)</Label>
                    <Textarea
                      value={(config.customer_support as any).quick_questions?.join('\n') || ''}
                      onChange={(e) =>
                        updateAI('customer_support', 'quick_questions', e.target.value.split('\n').filter(Boolean))
                      }
                      rows={3}
                      className="font-light text-xs"
                    />
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      <Button onClick={() => save(config)} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Configurações de IA
      </Button>
    </div>
  );
}

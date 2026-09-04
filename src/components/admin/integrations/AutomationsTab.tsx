import { useState, useEffect } from 'react';
import { Save, Loader2, MessageCircle, Mail, Zap, ShoppingCart, UserPlus, Package, Truck, CheckCircle, Plus, X, RotateCcw, Calendar, Star, Tag, Bell, MessageSquarePlus, Send, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useIntegrations, useSaveIntegrations, type AutomationsConfig, type AutomationEvent, type AutomationStep } from '@/hooks/useIntegrations';
import { PreviewTabs } from './previews/PreviewTabs';
import { ThrottlingCard } from './ThrottlingCard';
import { TestTemplateDialog } from './TestTemplateDialog';
import { EmailCampaignCard } from './EmailCampaignCard';

const DEFAULT_THROTTLING = {
  enabled: true,
  global_max_per_minute: 30,
  spread_window_minutes: 60,
  whatsapp: { max_per_minute: 10, min_delay_seconds: 4, jitter_seconds: 6 },
  email: { max_per_minute: 60, min_delay_seconds: 1, jitter_seconds: 3 },
  push: { max_per_minute: 120, min_delay_seconds: 0, jitter_seconds: 1 },
  quiet_hours: { enabled: true, start: '22:00', end: '08:00' },
};

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'both', label: 'WhatsApp + E-mail', icon: Zap },
  { value: 'push', label: 'Push Notification', icon: Bell },
  { value: 'whatsapp_push', label: 'WhatsApp + Push', icon: MessageSquarePlus },
  { value: 'email_push', label: 'E-mail + Push', icon: Mail },
  { value: 'all', label: 'Todos (WhatsApp + E-mail + Push)', icon: Zap },
];

const DELAY_OPTIONS = [
  { value: 0, label: 'Imediato' },
  { value: 0.25, label: '15 minutos' },
  { value: 0.5, label: '30 minutos' },
  { value: 1, label: '1 hora' },
  { value: 2, label: '2 horas' },
  { value: 4, label: '4 horas' },
  { value: 6, label: '6 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '1 dia' },
  { value: 48, label: '2 dias' },
  { value: 72, label: '3 dias' },
  { value: 168, label: '1 semana' },
  { value: 336, label: '2 semanas' },
  { value: 720, label: '30 dias' },
];

interface EventDefinition {
  key: keyof AutomationsConfig;
  label: string;
  description: string;
  icon: React.ElementType;
  variables: string[];
  supportsDelay: boolean;
  defaultStep: Omit<AutomationStep, 'id'>;
}

const EVENTS: EventDefinition[] = [
  {
    key: 'order_confirmed',
    label: 'Pedido Confirmado / Pago',
    description: 'Disparado quando o pagamento é aprovado',
    icon: CheckCircle,
    variables: ['nome', 'numero_pedido', 'total', 'itens'],
    supportsDelay: false,
    defaultStep: { enabled: true, delay_hours: 0, channel: 'both', template: 'Olá {{nome}}! 🎉 Seu pedido {{numero_pedido}} foi confirmado e está sendo preparado. Total: {{total}}. Obrigado pela compra!', subject: 'Pedido {{numero_pedido}} confirmado!' },
  },
  {
    key: 'order_shipped',
    label: 'Pedido Enviado',
    description: 'Disparado quando o status muda para "Enviado"',
    icon: Truck,
    variables: ['nome', 'numero_pedido', 'codigo_rastreio', 'link_rastreio'],
    supportsDelay: false,
    defaultStep: { enabled: true, delay_hours: 0, channel: 'whatsapp', template: 'Olá {{nome}}! 📦 Seu pedido {{numero_pedido}} foi enviado! Rastreie pelo código: {{codigo_rastreio}}\n{{link_rastreio}}' },
  },
  {
    key: 'order_delivered',
    label: 'Pedido Entregue',
    description: 'Disparado quando o status muda para "Entregue"',
    icon: Package,
    variables: ['nome', 'numero_pedido'],
    supportsDelay: false,
    defaultStep: { enabled: true, delay_hours: 0, channel: 'whatsapp', template: 'Olá {{nome}}! ✅ Seu pedido {{numero_pedido}} foi entregue! Esperamos que você adore. Que tal deixar uma avaliação?' },
  },
  {
    key: 'abandoned_cart',
    label: 'Carrinho Abandonado',
    description: 'Sequência de recuperação após o cliente abandonar o carrinho',
    icon: ShoppingCart,
    variables: ['nome', 'link_carrinho'],
    supportsDelay: true,
    defaultStep: { enabled: true, delay_hours: 1, channel: 'whatsapp', template: 'Olá {{nome}}! 🛒 Você esqueceu itens no carrinho. Finalize sua compra: {{link_carrinho}}' },
  },
  {
    key: 'welcome',
    label: 'Boas-vindas (Novo Cadastro)',
    description: 'Enviado quando um novo usuário se cadastra',
    icon: UserPlus,
    variables: ['nome'],
    supportsDelay: false,
    defaultStep: { enabled: true, delay_hours: 0, channel: 'email', template: 'Olá {{nome}}! 👋 Bem-vindo à nossa loja! Explore nosso catálogo e aproveite ofertas exclusivas.', subject: 'Bem-vindo à nossa loja!' },
  },
  {
    key: 'birthday',
    label: 'Aniversário do Cliente',
    description: 'Enviado no dia do aniversário do cliente (data de nascimento do cadastro)',
    icon: Calendar,
    variables: ['nome', 'link_loja'],
    supportsDelay: false,
    defaultStep: { enabled: true, delay_hours: 0, channel: 'both', template: 'Olá {{nome}}! 🎂 Feliz Aniversário! Temos um presente especial para você. Acesse nossa loja: {{link_loja}}', subject: '🎂 Feliz Aniversário, {{nome}}!' },
  },
  {
    key: 'account_anniversary',
    label: 'Aniversário de Cadastro',
    description: 'Enviado no aniversário de registro do cliente (1 ano, 2 anos, etc.)',
    icon: Star,
    variables: ['nome', 'tempo_cliente', 'link_loja'],
    supportsDelay: false,
    defaultStep: { enabled: true, delay_hours: 0, channel: 'both', template: 'Olá {{nome}}! 🎉 Faz {{tempo_cliente}} que você faz parte da nossa família! Obrigado pela fidelidade. Acesse: {{link_loja}}', subject: '🎉 Obrigado por {{tempo_cliente}} com a gente, {{nome}}!' },
  },
  {
    key: 'review_request',
    label: 'Pedido de Avaliação',
    description: 'Enviado X dias após a entrega para solicitar avaliação dos produtos',
    icon: Star,
    variables: ['nome', 'numero_pedido', 'link_avaliacao'],
    supportsDelay: true,
    defaultStep: { enabled: true, delay_hours: 72, channel: 'both', template: 'Olá {{nome}}! ⭐ Como foi sua experiência com o pedido {{numero_pedido}}?\nSua opinião é muito importante para nós! Avalie seus produtos: {{link_avaliacao}}', subject: '⭐ Avalie seu pedido {{numero_pedido}}!' },
  },
  {
    key: 'inactive_customer',
    label: 'Clientes Desaparecidos (Win-back)',
    description: 'Disparado uma vez quando o cliente fica X dias sem comprar (varredura diária às 9h)',
    icon: UserX,
    variables: ['nome', 'dias_inativo', 'ultimo_produto', 'cupom', 'link_loja'],
    supportsDelay: false,
    defaultStep: { enabled: true, delay_hours: 0, channel: 'email', template: 'Olá {{nome}}! 💜 Sentimos sua falta! Faz {{dias_inativo}} dias desde sua última compra. Use o cupom {{cupom}} e volte com tudo: {{link_loja}}', subject: 'Sentimos sua falta, {{nome}}!' },
  },
];

// ---- StepCard ----

interface StepCardProps {
  step: AutomationStep;
  index: number;
  supportsDelay: boolean;
  variables: string[];
  defaultStep: Omit<AutomationStep, 'id'>;
  onUpdate: (step: AutomationStep) => void;
  onRemove: () => void;
  canRemove: boolean;
  storeName?: string;
  fromName?: string;
  fromEmail?: string;
  eventLabel: string;
}

function StepCard({ step, index, supportsDelay, variables, defaultStep, onUpdate, onRemove, canRemove, storeName, fromName, fromEmail, eventLabel }: StepCardProps) {
  const [testOpen, setTestOpen] = useState(false);
  const insertVariable = (v: string) => {
    onUpdate({ ...step, template: (step.template || '') + `{{${v}}}` });
  };

  const handleReset = () => {
    onUpdate({ ...step, template: defaultStep.template, channel: defaultStep.channel, subject: defaultStep.subject });
  };

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${step.enabled ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'}`}>
      {/* Step header */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[52px]">Etapa {index + 1}</span>
        <Switch
          checked={step.enabled}
          onCheckedChange={(checked) => onUpdate({ ...step, enabled: checked })}
        />
        <span className="text-xs text-muted-foreground">{step.enabled ? 'Ativa' : 'Inativa'}</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={handleReset}
          title="Restaurar template padrão"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setTestOpen(true)}
          title="Enviar teste deste template"
        >
          <Send className="h-3 w-3" />
        </Button>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            title="Remover etapa"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Delay + Channel row */}
      <div className="flex gap-3 flex-wrap">
        {(supportsDelay || index > 0) && (
          <div className="space-y-1 flex-1 min-w-[120px]">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">⏱ Enviar após</Label>
            <Select value={String(step.delay_hours)} onValueChange={(v) => onUpdate({ ...step, delay_hours: Number(v) })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELAY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1 flex-1 min-w-[150px]">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Canal</Label>
          <Select value={step.channel} onValueChange={(v) => onUpdate({ ...step, channel: v as AutomationStep['channel'] })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Email subject (when channel includes email) */}
      {(['email', 'both', 'email_push', 'all'].includes(step.channel)) && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assunto do e-mail</Label>
          <input
            type="text"
            value={step.subject || ''}
            onChange={(e) => onUpdate({ ...step, subject: e.target.value })}
            placeholder="Assunto do e-mail..."
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      )}

      {/* Template */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mensagem</Label>
        <Textarea
          value={step.template || ''}
          onChange={(e) => onUpdate({ ...step, template: e.target.value })}
          placeholder="Digite o template da mensagem..."
          rows={3}
          className="font-mono text-sm resize-none"
        />
      </div>

      {/* Variables */}
      <div className="flex flex-wrap gap-1">
        {[...variables, 'cupom'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            className="text-xs px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground font-mono transition-colors cursor-pointer"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>

      {/* Coupon section */}
      <div className="rounded-md border border-dashed p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium">Cupom de Desconto Automático</Label>
          <div className="flex-1" />
          <Switch
            checked={step.coupon_enabled || false}
            onCheckedChange={(checked) => onUpdate({ ...step, coupon_enabled: checked })}
          />
        </div>

        {step.coupon_enabled && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={step.coupon_type || 'percentage'} onValueChange={(v) => onUpdate({ ...step, coupon_type: v as 'percentage' | 'fixed' })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage" className="text-xs">Percentual (%)</SelectItem>
                  <SelectItem value="fixed" className="text-xs">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valor</Label>
              <Input
                type="number"
                value={step.coupon_value || ''}
                onChange={(e) => onUpdate({ ...step, coupon_value: Number(e.target.value) })}
                placeholder={step.coupon_type === 'fixed' ? 'R$ 20' : '10%'}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prefixo do código</Label>
              <Input
                type="text"
                value={step.coupon_prefix || ''}
                onChange={(e) => onUpdate({ ...step, coupon_prefix: e.target.value.toUpperCase() })}
                placeholder="ANIVER"
                className="h-8 text-xs uppercase"
                maxLength={10}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Validade (dias)</Label>
              <Input
                type="number"
                value={step.coupon_expires_days || ''}
                onChange={(e) => onUpdate({ ...step, coupon_expires_days: Number(e.target.value) })}
                placeholder="7"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Usos máximos</Label>
              <Input
                type="number"
                value={step.coupon_max_uses ?? 1}
                onChange={(e) => onUpdate({ ...step, coupon_max_uses: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pedido mínimo (R$)</Label>
              <Input
                type="number"
                value={step.coupon_min_order || ''}
                onChange={(e) => onUpdate({ ...step, coupon_min_order: Number(e.target.value) || undefined })}
                placeholder="Opcional"
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="pt-3 border-t border-border/60">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Pré-visualização</Label>
        <PreviewTabs
          channel={step.channel}
          subject={step.subject}
          template={step.template}
          storeName={storeName}
          fromName={fromName}
          fromEmail={fromEmail}
        />
      </div>

      <TestTemplateDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        step={step}
        eventLabel={eventLabel}
      />
    </div>
  );
}

// ---- EventCard ----

interface EventCardProps {
  event: EventDefinition;
  value: AutomationEvent;
  onChange: (val: AutomationEvent) => void;
  storeName?: string;
  fromName?: string;
  fromEmail?: string;
}

function EventCard({ event, value, onChange, storeName, fromName, fromEmail }: EventCardProps) {
  const Icon = event.icon;
  const [expanded, setExpanded] = useState(false);

  const addStep = () => {
    const lastDelay = value.steps.length > 0 ? value.steps[value.steps.length - 1].delay_hours : 0;
    const newDelay = value.steps.length > 0 ? (event.supportsDelay ? lastDelay + 1 : 1) : 0;
    const newStep: AutomationStep = {
      id: crypto.randomUUID(),
      ...event.defaultStep,
      delay_hours: newDelay,
    };
    onChange({ ...value, steps: [...value.steps, newStep] });
  };

  const updateStep = (idx: number, step: AutomationStep) => {
    const steps = [...value.steps];
    steps[idx] = step;
    onChange({ ...value, steps });
  };

  const removeStep = (idx: number) => {
    onChange({ ...value, steps: value.steps.filter((_, i) => i !== idx) });
  };

  const activeStepsCount = value.steps.filter(s => s.enabled).length;

  return (
    <Card className={`border transition-colors ${value.enabled ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${value.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {event.label}
                {value.enabled && activeStepsCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{activeStepsCount} etapa{activeStepsCount > 1 ? 's' : ''}</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{event.description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={value.enabled}
            onCheckedChange={(checked) => {
              onChange({ ...value, enabled: checked });
              if (checked) setExpanded(true);
            }}
          />
        </div>

        {!value.enabled && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 text-left"
          >
            {expanded ? '▲ Ocultar configuração' : '▼ Configurar etapas'}
          </button>
        )}
      </CardHeader>

      {(value.enabled || expanded) && (
        <CardContent className="space-y-3 pt-0">
          {value.steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              index={idx}
              supportsDelay={event.supportsDelay}
              variables={event.variables}
              defaultStep={event.defaultStep}
              onUpdate={(s) => updateStep(idx, s)}
              onRemove={() => removeStep(idx)}
              canRemove={value.steps.length > 1}
              storeName={storeName}
              fromName={fromName}
              fromEmail={fromEmail}
              eventLabel={event.label}
            />
          ))}

          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed text-muted-foreground hover:text-foreground"
            onClick={addStep}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar Etapa
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

// ---- Main AutomationsTab ----

const DEFAULT_AUTOMATIONS: AutomationsConfig = {
  order_confirmed: { enabled: false, steps: [] },
  order_shipped: { enabled: false, steps: [] },
  order_delivered: { enabled: false, steps: [] },
  abandoned_cart: { enabled: false, steps: [] },
  welcome: { enabled: false, steps: [] },
  birthday: { enabled: false, steps: [] },
  account_anniversary: { enabled: false, steps: [] },
  review_request: { enabled: false, steps: [] },
  inactive_customer: { enabled: false, inactive_days: 60, steps: [] },
};

export function AutomationsTab() {
  const { data: integrations, isLoading } = useIntegrations();
  const saveIntegrations = useSaveIntegrations();
  const [automations, setAutomations] = useState<AutomationsConfig>(DEFAULT_AUTOMATIONS);

  useEffect(() => {
    if (integrations?.automations) {
      setAutomations({ ...DEFAULT_AUTOMATIONS, ...integrations.automations });
    }
  }, [integrations]);

  const handleSave = async () => {
    if (!integrations) return;
    await saveIntegrations.mutateAsync({ ...integrations, automations, throttling });
  };

  const updateEvent = (key: keyof AutomationsConfig, val: AutomationEvent) => {
    setAutomations(prev => ({ ...prev, [key]: val }));
  };

  const [throttling, setThrottling] = useState(DEFAULT_THROTTLING);
  useEffect(() => {
    if (integrations?.throttling) setThrottling({ ...DEFAULT_THROTTLING, ...integrations.throttling });
  }, [integrations]);

  const activeEventsCount = Object.values(automations).filter(e => e.enabled).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Automações e Mensagens</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure sequências de mensagens automáticas via WhatsApp ou E-mail para cada evento da loja.
            {activeEventsCount > 0 && (
              <Badge variant="secondary" className="ml-2">{activeEventsCount} ativo{activeEventsCount > 1 ? 's' : ''}</Badge>
            )}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveIntegrations.isPending}>
          {saveIntegrations.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Automações
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/80">
        <p className="font-medium mb-1">Como funciona</p>
        <p className="text-muted-foreground text-xs">
          Cada automação pode ter <strong>múltiplas etapas</strong> com mensagens e horários diferentes. 
          Configure os provedores nas abas <strong>WhatsApp</strong> e <strong>E-mail</strong> antes de ativar.
          Automações de <strong>aniversário</strong> rodam automaticamente todo dia às 9h.
        </p>
      </div>

      {/* Throttling / Anti-block */}
      <ThrottlingCard value={throttling} onChange={setThrottling} />

      {/* Campaign coupon shown in all emails */}
      <EmailCampaignCard />

      {/* Event cards — Order events */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Eventos de Pedido</h3>
        <div className="space-y-3">
          {EVENTS.filter(e => ['order_confirmed', 'order_shipped', 'order_delivered'].includes(e.key)).map(event => (
            <EventCard
              key={event.key}
              event={event}
              value={automations[event.key]}
              onChange={(val) => updateEvent(event.key, val)}
              storeName={integrations?.store_name}
              fromName={integrations?.email?.from_name}
              fromEmail={integrations?.email?.from_email}
            />
          ))}
        </div>
      </div>

      {/* Engagement events */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Engajamento</h3>
        <div className="space-y-3">
          {EVENTS.filter(e => ['abandoned_cart', 'welcome', 'inactive_customer'].includes(e.key)).map(event => (
            <EventCard
              key={event.key}
              event={event}
              value={automations[event.key]}
              onChange={(val) => updateEvent(event.key, val)}
              storeName={integrations?.store_name}
              fromName={integrations?.email?.from_name}
              fromEmail={integrations?.email?.from_email}
            />
          ))}
          {/* Inactive customer: days input */}
          {automations.inactive_customer?.enabled && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center gap-3">
              <Label htmlFor="inactive-days" className="text-sm font-medium whitespace-nowrap">
                Considerar inativo após
              </Label>
              <Input
                id="inactive-days"
                type="number"
                min={7}
                max={365}
                className="w-24"
                value={automations.inactive_customer.inactive_days ?? 60}
                onChange={(e) => updateEvent('inactive_customer', {
                  ...automations.inactive_customer,
                  inactive_days: parseInt(e.target.value) || 60,
                })}
              />
              <span className="text-sm text-muted-foreground">dias sem compra paga</span>
            </div>
          )}
        </div>
      </div>

      {/* Anniversary events */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Aniversários (disparo diário automático às 9h)</h3>
        <div className="space-y-3">
          {EVENTS.filter(e => ['birthday', 'account_anniversary'].includes(e.key)).map(event => (
            <EventCard
              key={event.key}
              event={event}
              value={automations[event.key]}
              onChange={(val) => updateEvent(event.key, val)}
              storeName={integrations?.store_name}
              fromName={integrations?.email?.from_name}
              fromEmail={integrations?.email?.from_email}
            />
          ))}
        </div>
      </div>

      {/* Post-sale events */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Pós-venda</h3>
        <div className="space-y-3">
          {EVENTS.filter(e => ['review_request'].includes(e.key)).map(event => (
            <EventCard
              key={event.key}
              event={event}
              value={automations[event.key]}
              onChange={(val) => updateEvent(event.key, val)}
              storeName={integrations?.store_name}
              fromName={integrations?.email?.from_name}
              fromEmail={integrations?.email?.from_email}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveIntegrations.isPending}>
          {saveIntegrations.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Automações
        </Button>
      </div>
    </div>
  );
}

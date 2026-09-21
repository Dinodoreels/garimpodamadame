import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MercadoPagoConfig {
  access_token: string;
  public_key: string;
  pix_expiration: string;
}

export interface PagSeguroConfig {
  token: string;
}

export interface PagarmeConfig {
  api_key: string;
}

export interface CieloConfig {
  merchant_id: string;
  merchant_key: string;
}

export interface AsaasConfig {
  api_key: string;
}

export interface EfiConfig {
  client_id: string;
  client_secret: string;
}

export interface OpenPixConfig {
  app_id: string;
}

export interface StripeConfig {
  secret_key: string;
}

export interface ShippingCorreiosConfig {
  origin_zip: string;
}

export interface ShippingMelhorEnvioConfig {
  origin_zip: string;
  credential_configured?: boolean;
  hybrid_enabled?: boolean;
}

export interface ShippingIntegrationConfig {
  active_provider: '' | 'correios' | 'melhor_envio';
  surcharge_enabled?: boolean;
  surcharge_amount?: number;
  correios: ShippingCorreiosConfig;
  melhor_envio: ShippingMelhorEnvioConfig;
}

export interface EvolutionConfig {
  base_url: string;
  api_key: string;
  instance: string;
}

export interface ZApiConfig {
  instance_id: string;
  token: string;
}

export interface WppConnectConfig {
  base_url: string;
  secret_key: string;
  session: string;
}

export interface UazapiConfig {
  base_url: string;
  instance_token: string;
  admin_token: string;
}

export interface TwilioConfig {
  account_sid: string;
  auth_token: string;
  phone: string;
}

export interface MetaConfig {
  phone_number_id: string;
  access_token: string;
  verify_token: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  bearer_token: string;
  custom_header_name: string;
  custom_header_value: string;
}

export interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  password: string;
}

export interface ResendConfig {
  api_key: string;
}

export interface SendGridConfig {
  api_key: string;
}

export interface EmailConfig {
  active_provider: '' | 'smtp' | 'resend' | 'sendgrid';
  smtp: SmtpConfig;
  resend: ResendConfig;
  sendgrid: SendGridConfig;
  from_name: string;
  from_email: string;
}

export interface AutomationStep {
  id: string;
  enabled: boolean;
  delay_hours: number;
  channel: 'whatsapp' | 'email' | 'both' | 'push' | 'whatsapp_push' | 'email_push' | 'all';
  template: string;
  subject?: string;
  coupon_enabled?: boolean;
  coupon_type?: 'percentage' | 'fixed';
  coupon_value?: number;
  coupon_expires_days?: number;
  coupon_prefix?: string;
  coupon_max_uses?: number;
  coupon_min_order?: number;
}

export interface AutomationEvent {
  enabled: boolean;
  steps: AutomationStep[];
  inactive_days?: number;
}

export interface AutomationsConfig {
  order_confirmed: AutomationEvent;
  order_shipped: AutomationEvent;
  order_delivered: AutomationEvent;
  abandoned_cart: AutomationEvent;
  welcome: AutomationEvent;
  birthday: AutomationEvent;
  account_anniversary: AutomationEvent;
  review_request: AutomationEvent;
  inactive_customer: AutomationEvent;
}

export interface AdminWhatsAppConfig {
  active_provider: string;
  evolution: EvolutionConfig;
  zapi: ZApiConfig;
  wppconnect: WppConnectConfig;
  uazapi: UazapiConfig;
  twilio: TwilioConfig;
  meta: MetaConfig;
  webhook: WebhookConfig;
}

export interface AdminReportsConfig {
  daily_enabled: boolean;
  weekly_enabled: boolean;
  monthly_enabled: boolean;
  whatsapp: AdminWhatsAppConfig;
  email_recipients?: string[];
  daily_channel?: 'whatsapp' | 'email' | 'both';
  weekly_channel?: 'whatsapp' | 'email' | 'both';
  monthly_channel?: 'whatsapp' | 'email' | 'both';
  alerts_channel?: 'whatsapp' | 'email' | 'both';
  cash_register_alerts?: {
    close_register_summary?: boolean;
    unclosed_register_alert?: boolean;
    divergence_threshold?: number;
  };
  expense_due_alerts?: {
    enabled?: boolean;
    days_before?: number;
  };
  monthly_closing_reminder?: boolean;
}

export interface ChannelThrottle {
  max_per_minute: number;
  min_delay_seconds: number;
  jitter_seconds: number;
}

export interface ThrottlingConfig {
  enabled: boolean;
  global_max_per_minute: number;
  spread_window_minutes: number;
  whatsapp: ChannelThrottle;
  email: ChannelThrottle;
  push: ChannelThrottle;
  quiet_hours: { enabled: boolean; start: string; end: string };
}

export interface IntegrationsConfig {
  store_name?: string;
  contact_email?: string;
  contact_phone?: string;
  admin_reports?: AdminReportsConfig;
  throttling?: ThrottlingConfig;
  payment: {
    active_gateway: string;
    mercadopago: MercadoPagoConfig;
    pagseguro: PagSeguroConfig;
    pagarme: PagarmeConfig;
    cielo: CieloConfig;
    asaas: AsaasConfig;
    efi: EfiConfig;
    openpix: OpenPixConfig;
    stripe: StripeConfig;
  };
  whatsapp: {
    active_provider: string;
    evolution: EvolutionConfig;
    zapi: ZApiConfig;
    wppconnect: WppConnectConfig;
    uazapi: UazapiConfig;
    twilio: TwilioConfig;
    meta: MetaConfig;
    webhook: WebhookConfig;
  };
  email: EmailConfig;
  automations: AutomationsConfig;
  shipping: ShippingIntegrationConfig;
}

function makeStep(id: string, channel: AutomationStep['channel'], template: string, delay_hours = 0, subject?: string): AutomationStep {
  return { id, enabled: false, delay_hours, channel, template, subject };
}

/** Migrates old flat AutomationEvent format (template/channel/delay_hours at root) to new steps[] format */
function migrateAutomationEvent(old: any, defaultEvent: AutomationEvent): AutomationEvent {
  if (!old) return defaultEvent;
  // Already new format
  if (Array.isArray(old.steps)) {
    return { enabled: old.enabled ?? false, steps: old.steps };
  }
  // Old flat format — wrap into a single step
  return {
    enabled: old.enabled ?? false,
    steps: [{
      id: crypto.randomUUID(),
      enabled: true,
      delay_hours: old.delay_hours ?? 0,
      channel: old.channel ?? 'whatsapp',
      template: old.template ?? '',
      subject: old.subject,
    }],
  };
}

const DEFAULT_CONFIG: IntegrationsConfig = {
  store_name: '',
  contact_email: '',
  contact_phone: '',
  payment: {
    active_gateway: '',
    mercadopago: { access_token: '', public_key: '', pix_expiration: '30' },
    pagseguro: { token: '' },
    pagarme: { api_key: '' },
    cielo: { merchant_id: '', merchant_key: '' },
    asaas: { api_key: '' },
    efi: { client_id: '', client_secret: '' },
    openpix: { app_id: '' },
    stripe: { secret_key: '' },
  },
  whatsapp: {
    active_provider: '',
    evolution: { base_url: '', api_key: '', instance: '' },
    zapi: { instance_id: '', token: '' },
    wppconnect: { base_url: '', secret_key: '', session: '' },
    uazapi: { base_url: 'https://free.uazapi.com', instance_token: '', admin_token: '' },
    twilio: { account_sid: '', auth_token: '', phone: '' },
    meta: { phone_number_id: '', access_token: '', verify_token: '' },
    webhook: { url: '', method: 'POST', bearer_token: '', custom_header_name: '', custom_header_value: '' },
  },
  email: {
    active_provider: '',
    smtp: { host: 'smtp.gmail.com', port: '587', user: '', password: '' },
    resend: { api_key: '' },
    sendgrid: { api_key: '' },
    from_name: '',
    from_email: '',
  },
  automations: {
    order_confirmed: {
      enabled: false,
      steps: [
        makeStep('oc-1', 'both', 'Olá {{nome}}! 🎉 Seu pedido {{numero_pedido}} foi confirmado e está sendo preparado. Total: {{total}}. Obrigado pela compra!', 0, 'Pedido {{numero_pedido}} confirmado!'),
      ],
    },
    order_shipped: {
      enabled: false,
      steps: [
        makeStep('os-1', 'whatsapp', 'Olá {{nome}}! 📦 Seu pedido {{numero_pedido}} foi enviado! Rastreie pelo código: {{codigo_rastreio}}\n{{link_rastreio}}', 0),
      ],
    },
    order_delivered: {
      enabled: false,
      steps: [
        makeStep('od-1', 'whatsapp', 'Olá {{nome}}! ✅ Seu pedido {{numero_pedido}} foi entregue! Esperamos que você adore. Que tal deixar uma avaliação?', 0),
      ],
    },
    abandoned_cart: {
      enabled: false,
      steps: [
        makeStep('ac-1', 'whatsapp', 'Olá {{nome}}! 🛒 Você esqueceu itens no carrinho. Finalize sua compra: {{link_carrinho}}', 1),
        makeStep('ac-2', 'whatsapp', 'Olá {{nome}}! Ainda pensando? Seus itens ainda estão reservados. Aproveite antes que acabem! {{link_carrinho}}', 6),
        makeStep('ac-3', 'both', 'Olá {{nome}}! ⏰ Última chance! Seu carrinho está prestes a expirar. Finalize agora: {{link_carrinho}}', 24, 'Seus itens estão esperando por você!'),
      ],
    },
    welcome: {
      enabled: false,
      steps: [
        makeStep('wl-1', 'email', 'Olá {{nome}}! 👋 Bem-vindo à nossa loja! Explore nosso catálogo e aproveite ofertas exclusivas.', 0, 'Bem-vindo à nossa loja!'),
      ],
    },
    birthday: {
      enabled: false,
      steps: [
        makeStep('bd-1', 'both', 'Olá {{nome}}! 🎂 Feliz Aniversário! Temos um presente especial para você. Acesse nossa loja: {{link_loja}}', 0, '🎂 Feliz Aniversário, {{nome}}!'),
      ],
    },
    account_anniversary: {
      enabled: false,
      steps: [
        makeStep('aa-1', 'both', 'Olá {{nome}}! 🎉 Faz {{tempo_cliente}} que você faz parte da nossa família! Obrigado pela fidelidade. Acesse: {{link_loja}}', 0, '🎉 Obrigado por {{tempo_cliente}} com a gente, {{nome}}!'),
      ],
    },
    review_request: {
      enabled: false,
      steps: [
        makeStep('rr-1', 'both', 'Olá {{nome}}! ⭐ Como foi sua experiência com o pedido {{numero_pedido}}?\nSua opinião é muito importante para nós! Avalie seus produtos: {{link_avaliacao}}', 72, '⭐ Avalie seu pedido {{numero_pedido}}!'),
      ],
    },
    inactive_customer: {
      enabled: false,
      inactive_days: 60,
      steps: [
        makeStep('ic-1', 'email', 'Olá {{nome}}! 💜 Sentimos sua falta! Faz {{dias_inativo}} dias desde sua última compra. Use o cupom {{cupom}} e volte com tudo: {{link_loja}}', 0, 'Sentimos sua falta, {{nome}}!'),
      ],
    },
  },
  shipping: {
    active_provider: '',
    surcharge_enabled: false,
    surcharge_amount: 0,
    correios: { origin_zip: '' },
    melhor_envio: { origin_zip: '', credential_configured: false, hybrid_enabled: true },
  },
  throttling: {
    enabled: true,
    global_max_per_minute: 30,
    spread_window_minutes: 60,
    whatsapp: { max_per_minute: 10, min_delay_seconds: 4, jitter_seconds: 6 },
    email: { max_per_minute: 60, min_delay_seconds: 1, jitter_seconds: 3 },
    push: { max_per_minute: 120, min_delay_seconds: 0, jitter_seconds: 1 },
    quiet_hours: { enabled: true, start: '22:00', end: '08:00' },
  },
};

function mergeDeep(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] ?? {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async (): Promise<IntegrationsConfig> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'integrations')
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_CONFIG;

      const raw = data.value as any;

      // Never expose or keep legacy shipping credentials in browser-managed settings.
      if (raw?.shipping?.melhor_envio) {
        delete raw.shipping.melhor_envio.token;
      }

      // Merge non-automations config normally
      const merged = mergeDeep(DEFAULT_CONFIG, raw);

      // Migrate automations separately to handle old flat format
      if (raw.automations) {
        const eventKeys: (keyof AutomationsConfig)[] = [
          'order_confirmed', 'order_shipped', 'order_delivered',
          'abandoned_cart', 'welcome', 'birthday', 'account_anniversary', 'review_request', 'inactive_customer',
        ];
        for (const key of eventKeys) {
          if (raw.automations[key] !== undefined) {
            merged.automations[key] = migrateAutomationEvent(
              raw.automations[key],
              DEFAULT_CONFIG.automations[key],
            );
          }
        }
      }

      // Migrate old flat email config to new nested format
      if (raw.email && !raw.email.smtp && raw.email.smtp_host) {
        merged.email = {
          active_provider: raw.email.smtp_user ? 'smtp' : '',
          smtp: {
            host: raw.email.smtp_host || 'smtp.gmail.com',
            port: raw.email.smtp_port || '587',
            user: raw.email.smtp_user || '',
            password: raw.email.smtp_password || '',
          },
          resend: merged.email.resend || { api_key: '' },
          sendgrid: merged.email.sendgrid || { api_key: '' },
          from_name: raw.email.from_name || '',
          from_email: raw.email.from_email || '',
        };
      }

      return merged;
    },
  });
}

export function useSaveIntegrations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: IntegrationsConfig) => {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'integrations')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: config as any, updated_at: new Date().toISOString() })
          .eq('key', 'integrations');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({ key: 'integrations', value: config as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Erro ao salvar configurações.' });
    },
  });
}

import { useState } from 'react';
import { Plus, CheckCircle2, Eye, EyeOff, Save, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { IntegrationsConfig } from '@/hooks/useIntegrations';
import { ProviderSetupGuide } from './ProviderSetupGuide';
import { WHATSAPP_GUIDES } from './providerGuides';
import { TestMessageDialog } from './TestMessageDialog';


interface WhatsAppTabProps {
  config: IntegrationsConfig;
  onSave: (config: IntegrationsConfig) => void;
  isSaving: boolean;
}

type Provider = 'evolution' | 'zapi' | 'wppconnect' | 'uazapi' | 'twilio' | 'meta' | 'webhook';

interface ProviderInfo {
  id: Provider;
  name: string;
  description: string;
  initials: string;
  color: string;
  bgColor: string;
  badges: { label: string; type?: 'official' | 'opensource' | 'unofficial' }[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'evolution',
    name: 'Evolution API',
    description: 'API open-source para WhatsApp não-oficial',
    initials: 'EV',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    badges: [
      { label: 'Open-source', type: 'opensource' },
      { label: 'Mensagens' },
      { label: 'Grupos' },
      { label: 'Mídia' },
    ],
  },
  {
    id: 'zapi',
    name: 'Z-API',
    description: 'API brasileira para WhatsApp',
    initials: 'Z',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    badges: [
      { label: 'Não-oficial', type: 'unofficial' },
      { label: 'Mensagens' },
      { label: 'Mídia' },
    ],
  },
  {
    id: 'wppconnect',
    name: 'WPPConnect',
    description: 'Biblioteca open-source para WhatsApp',
    initials: 'WP',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    badges: [
      { label: 'Open-source', type: 'opensource' },
      { label: 'Mensagens' },
      { label: 'Grupos' },
      { label: 'Mídia' },
    ],
  },
  {
    id: 'uazapi',
    name: 'UAZAPI',
    description: 'Gateway brasileiro com plano free e multi-instância',
    initials: 'UA',
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10',
    badges: [
      { label: 'Não-oficial', type: 'unofficial' },
      { label: 'Mensagens' },
      { label: 'Mídia' },
      { label: 'Grupos' },
      { label: 'Multi-instância' },
    ],
  },
  {
    id: 'twilio',
    name: 'Twilio WhatsApp',
    description: 'API oficial via Twilio Business',
    initials: 'TW',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    badges: [
      { label: 'Oficial', type: 'official' },
      { label: 'Mensagens' },
      { label: 'Mídia' },
      { label: 'Templates' },
    ],
  },
  {
    id: 'meta',
    name: 'Meta Business API',
    description: 'API oficial do WhatsApp Business',
    initials: 'MB',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10',
    badges: [
      { label: 'Oficial', type: 'official' },
      { label: 'Mensagens' },
      { label: 'Templates' },
      { label: 'Grupos' },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Envie para sua URL (n8n, Make, sistema próprio)',
    initials: 'WH',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    badges: [
      { label: 'Genérico', type: 'opensource' },
      { label: 'Custom' },
      { label: 'HTTP' },
    ],
  },
];

function getBadgeClass(type?: string) {
  if (type === 'official') return 'bg-green-500/10 text-green-700 border-green-500/30';
  if (type === 'opensource') return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
  if (type === 'unofficial') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  return '';
}

function ProviderForm({
  provider,
  config,
  onClose,
  onSave,
  isSaving,
}: {
  provider: ProviderInfo;
  config: IntegrationsConfig;
  onClose: () => void;
  onSave: (updated: IntegrationsConfig) => void;
  isSaving: boolean;
}) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState(() => {
    const wap = config.whatsapp;
    if (provider.id === 'evolution') return { ...wap.evolution };
    if (provider.id === 'zapi') return { ...wap.zapi };
    if (provider.id === 'wppconnect') return { ...wap.wppconnect };
    if (provider.id === 'uazapi') return { ...wap.uazapi };
    if (provider.id === 'twilio') return { ...wap.twilio };
    if (provider.id === 'meta') return { ...wap.meta };
    if (provider.id === 'webhook') return { ...wap.webhook };
    return {};
  });

  const toggleShow = (field: string) =>
    setShowPasswords((p) => ({ ...p, [field]: !p[field] }));

  const handleSave = () => {
    const updated: IntegrationsConfig = {
      ...config,
      whatsapp: {
        ...config.whatsapp,
        active_provider: provider.id,
        [provider.id]: form,
      },
    };
    onSave(updated);
  };

  const field = (
    id: string,
    label: string,
    placeholder: string,
    isSecret = false,
    hint?: string
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs tracking-wider uppercase font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={isSecret && !showPasswords[id] ? 'password' : 'text'}
          value={(form as any)[id] ?? ''}
          onChange={(e) => setForm((f: any) => ({ ...f, [id]: e.target.value }))}
          placeholder={placeholder}
          className={`font-mono text-sm ${isSecret ? 'pr-10' : ''}`}
        />
        {isSecret && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => toggleShow(id)}
          >
            {showPasswords[id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-md ${provider.bgColor} flex items-center justify-center`}>
              <span className={`text-xs font-bold ${provider.color}`}>{provider.initials}</span>
            </div>
            Configurar {provider.name}
          </DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {WHATSAPP_GUIDES[provider.id] && <ProviderSetupGuide guide={WHATSAPP_GUIDES[provider.id]} />}
          {provider.id === 'evolution' && (
            <>
              {field('base_url', 'URL Base', 'https://api.seuservidor.com', false, 'URL da sua instância Evolution API')}
              {field('instance', 'Instância', 'minha-instancia')}
              {field('api_key', 'API Key', 'sua-api-key', true)}
            </>
          )}
          {provider.id === 'zapi' && (
            <>
              {field('instance_id', 'Instance ID', 'seu-instance-id')}
              {field('token', 'Token', 'seu-token', true)}
            </>
          )}
          {provider.id === 'wppconnect' && (
            <>
              {field('base_url', 'URL Base', 'https://api.seuservidor.com')}
              {field('session', 'Session', 'minha-sessao')}
              {field('secret_key', 'Secret Key', 'sua-secret-key', true)}
            </>
          )}
          {provider.id === 'uazapi' && (
            <>
              {field('base_url', 'URL Base', 'https://free.uazapi.com', false, 'Use https://free.uazapi.com (plano grátis) ou seu domínio próprio')}
              {field('instance_token', 'Token da Instância', 'cole-o-token-aqui', true, 'Token único de cada instância criada no painel UAZAPI')}
              {field('admin_token', 'Admin Token (opcional)', 'admin-token', true, 'Necessário apenas se quiser criar/gerenciar instâncias pela API')}
            </>
          )}
          {provider.id === 'twilio' && (
            <>
              {field('account_sid', 'Account SID', 'ACxxxxxxxxxxxxxxxx')}
              {field('auth_token', 'Auth Token', 'seu-auth-token', true)}
              {field('phone', 'Número WhatsApp', 'whatsapp:+14155238886', false, 'Formato: whatsapp:+1XXXXXXXXXX')}
            </>
          )}
          {provider.id === 'meta' && (
            <>
              {field('phone_number_id', 'Phone Number ID', '1234567890')}
              {field('access_token', 'Access Token', 'EAAxxxxx...', true)}
              {field('verify_token', 'Verify Token (Webhook)', 'meu-token-secreto', true)}
            </>
          )}
          {provider.id === 'webhook' && (
            <>
              {field('url', 'URL do Webhook', 'https://n8n.minhaloja.com/webhook/whatsapp', false, 'Endpoint HTTPS que receberá as mensagens')}
              <div className="space-y-1.5">
                <Label className="text-xs tracking-wider uppercase font-medium">Método HTTP</Label>
                <div className="flex gap-2">
                  {(['POST', 'PUT'] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant={(form as any).method === m ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setForm((f: any) => ({ ...f, method: m }))}
                      className="flex-1"
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
              {field('bearer_token', 'Token Secreto (opcional)', 'meu-token', true, 'Enviado como Authorization: Bearer {token}')}
              {field('custom_header_name', 'Header Custom — Nome (opcional)', 'X-Api-Key', false, 'Ex: X-Api-Key, X-Webhook-Secret')}
              {field('custom_header_value', 'Header Custom — Valor (opcional)', 'valor-do-header', true)}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar e Ativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WhatsAppTab({ config, onSave, isSaving }: WhatsAppTabProps) {
  const [openProvider, setOpenProvider] = useState<Provider | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  const activeProvider = config.whatsapp.active_provider;
  const activeProviderName = PROVIDERS.find((p) => p.id === activeProvider)?.name;

  const isConfigured = (id: Provider) => {
    const p = config.whatsapp[id] as any;
    return p && Object.values(p).some((v) => !!v);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Escolha e configure um provedor de WhatsApp. Apenas um pode estar ativo por vez.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setTestOpen(true)}
          disabled={!activeProvider}
          title={activeProvider ? 'Enviar mensagem de teste' : 'Ative um provedor primeiro'}
        >
          <Send className="h-3.5 w-3.5 mr-2" />
          Testar mensagem
        </Button>
      </div>
      <TestMessageDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        channel="whatsapp"
        providerLabel={activeProviderName}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const configured = isConfigured(provider.id);
          const active = activeProvider === provider.id;

          return (
            <Card
              key={provider.id}
              className={`relative transition-all ${
                active
                  ? 'border-green-500/50 bg-green-500/5'
                  : configured
                  ? 'border-primary/30'
                  : 'border-border'
              }`}
            >
              {active && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-9 h-9 rounded-lg ${provider.bgColor} flex items-center justify-center shrink-0`}
                  >
                    <span className={`text-sm font-bold ${provider.color}`}>
                      {provider.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm leading-tight">{provider.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{provider.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {provider.badges.map((b) => (
                    <Badge
                      key={b.label}
                      variant="outline"
                      className={`text-xs py-0 ${getBadgeClass(b.type)}`}
                    >
                      {b.label}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Button
                  size="sm"
                  variant={active ? 'default' : configured ? 'secondary' : 'outline'}
                  className="w-full text-xs"
                  onClick={() => setOpenProvider(provider.id)}
                >
                  {active ? (
                    '✓ Configurado'
                  ) : configured ? (
                    'Reconfigurar'
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Configurar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {openProvider && (
        <ProviderForm
          provider={PROVIDERS.find((p) => p.id === openProvider)!}
          config={config}
          onClose={() => setOpenProvider(null)}
          onSave={(updated) => {
            onSave(updated);
            setOpenProvider(null);
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

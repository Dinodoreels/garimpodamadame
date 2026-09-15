import { useState } from 'react';
import { Loader2, Plus, CheckCircle2, Zap, Wifi, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { IntegrationsConfig } from '@/hooks/useIntegrations';
import { ProviderSetupGuide } from './ProviderSetupGuide';
import { PAYMENT_GUIDES } from './providerGuides';


interface PaymentTabProps {
  config: IntegrationsConfig;
  onSave: (config: IntegrationsConfig) => void;
  isSaving: boolean;
}

type GatewayId = 'mercadopago' | 'pagseguro' | 'pagarme' | 'cielo' | 'asaas' | 'efi' | 'openpix' | 'stripe';

interface GatewayDef {
  id: GatewayId;
  name: string;
  initials: string;
  color: string;
  bgColor: string;
  subtitle: string;
  methods: string[];
  hasRealIntegration: boolean;
  fields: { key: string; label: string; placeholder: string; secret?: boolean; type?: string }[];
}

const GATEWAYS: GatewayDef[] = [
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    initials: 'MP',
    color: '#009ee3',
    bgColor: 'rgba(0,158,227,0.12)',
    subtitle: 'O gateway mais popular da América Latina',
    methods: ['Pix', 'Cartão'],
    hasRealIntegration: true,
    fields: [{ key: 'pix_expiration', label: 'Expiração do Pix (minutos)', placeholder: '30', type: 'number' }],
  },
  {
    id: 'pagseguro',
    name: 'PagBank',
    initials: 'PB',
    color: '#00b14f',
    bgColor: 'rgba(0,177,79,0.12)',
    subtitle: 'Pagamentos integrados do PagSeguro',
    methods: ['Pix', 'Cartão', 'Boleto'],
    hasRealIntegration: false,
    fields: [{ key: 'token', label: 'Token', placeholder: 'seu-token-pagseguro', secret: true }],
  },
  {
    id: 'pagarme',
    name: 'Pagar.me',
    initials: 'PM',
    color: '#7c3aed',
    bgColor: 'rgba(124,58,237,0.12)',
    subtitle: 'Gateway brasileiro completo',
    methods: ['Pix', 'Cartão', 'Boleto'],
    hasRealIntegration: false,
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'ak_...', secret: true }],
  },
  {
    id: 'cielo',
    name: 'Cielo',
    initials: 'CI',
    color: '#003087',
    bgColor: 'rgba(0,48,135,0.12)',
    subtitle: 'Líder em meios de pagamento no Brasil',
    methods: ['Pix', 'Cartão', 'Boleto'],
    hasRealIntegration: false,
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'seu-merchant-id' },
      { key: 'merchant_key', label: 'Merchant Key', placeholder: 'sua-merchant-key', secret: true },
    ],
  },
  {
    id: 'asaas',
    name: 'Asaas',
    initials: 'AS',
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.12)',
    subtitle: 'Gestão financeira e cobranças',
    methods: ['Pix', 'Cartão', 'Boleto'],
    hasRealIntegration: false,
    fields: [{ key: 'api_key', label: 'API Key', placeholder: '$aact_...', secret: true }],
  },
  {
    id: 'efi',
    name: 'EFÍ Bank',
    initials: 'EF',
    color: '#16a34a',
    bgColor: 'rgba(22,163,74,0.12)',
    subtitle: 'Pix e boletos sem intermediários',
    methods: ['Pix', 'Boleto'],
    hasRealIntegration: false,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'seu-client-id' },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'seu-client-secret', secret: true },
    ],
  },
  {
    id: 'openpix',
    name: 'OpenPix',
    initials: 'OP',
    color: '#6d28d9',
    bgColor: 'rgba(109,40,217,0.12)',
    subtitle: 'Pix instantâneo para e-commerce',
    methods: ['Pix'],
    hasRealIntegration: false,
    fields: [{ key: 'app_id', label: 'App ID', placeholder: 'seu-app-id', secret: true }],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    initials: 'ST',
    color: '#4f46e5',
    bgColor: 'rgba(79,70,229,0.12)',
    subtitle: 'Gateway global com suporte internacional',
    methods: ['Pix', 'Cartão'],
    hasRealIntegration: false,
    fields: [{ key: 'secret_key', label: 'Secret Key', placeholder: 'sk_...', secret: true }],
  },
];

function isGatewayConfigured(config: IntegrationsConfig, id: GatewayId): boolean {
  const p = config.payment as any;
  const gw = p[id];
  if (!gw) return false;
  return Object.values(gw).some((v) => typeof v === 'string' && (v as string).trim() !== '');
}

export function PaymentTab({ config, onSave, isSaving }: PaymentTabProps) {
  const [selectedGateway, setSelectedGateway] = useState<GatewayDef | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const activeGateway = config.payment.active_gateway;

  const openGateway = (gw: GatewayDef) => {
    const current = (config.payment as any)[gw.id] ?? {};
    const vals: Record<string, string> = {};
    gw.fields.forEach((f) => { vals[f.key] = current[f.key] ?? ''; });
    setFieldValues(vals);
    setSelectedGateway(gw);
  };

  const handleSaveCredentials = () => {
    if (!selectedGateway) return;
    const updated = {
      ...config,
      payment: {
        ...config.payment,
        active_gateway: selectedGateway.id,
        [selectedGateway.id]: fieldValues,
      },
    };
    onSave(updated as IntegrationsConfig);
  };

  const handleTestConnection = async () => {
    if (!selectedGateway) return;

    if (!selectedGateway.hasRealIntegration) {
      toast({
        title: 'Validação em breve',
        description: `A validação de credenciais para ${selectedGateway.name} estará disponível em breve.`,
      });
      return;
    }

    // Mercado Pago — test via backend function (avoids CORS)
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-mercadopago', {
        body: {},
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao testar', description: 'Não foi possível conectar ao servidor de validação.' });
        return;
      }

      if (data.success) {
        const envLabel = data.environment === 'sandbox' ? ' (Sandbox/Teste)' : ' (Produção)';
        toast({ title: '✅ Conexão bem-sucedida!' + envLabel, description: 'Credenciais do Mercado Pago validadas com sucesso.' });
      } else {
        toast({ 
          variant: 'destructive', 
          title: data.error || 'Credenciais inválidas', 
          description: data.detail || 'Verifique o Access Token informado.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {GATEWAYS.map((gw) => {
          const configured = isGatewayConfigured(config, gw.id);
          const isActive = activeGateway === gw.id;
          return (
            <button
              key={gw.id}
              onClick={() => openGateway(gw)}
              className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 bg-card ${
                isActive
                  ? 'border-green-500/60 shadow-sm shadow-green-500/10'
                  : configured
                  ? 'border-primary/30'
                  : 'border-border'
              }`}
            >
              {/* Top right indicator */}
              <div className="absolute top-2 right-2">
                {isActive ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-500/10 border border-green-500/30 rounded-full px-1.5 py-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Ativo
                  </span>
                ) : (
                  <span className="h-5 w-5 flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Plus className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-sm font-bold"
                style={{ background: gw.bgColor, color: gw.color }}
              >
                {gw.initials}
              </div>

              {/* Name */}
              <p className="text-sm font-semibold text-foreground leading-tight mb-2">{gw.name}</p>

              {/* Methods */}
              <div className="flex flex-wrap gap-1 justify-center">
                {gw.methods.map((m) => (
                  <span
                    key={m}
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sheet lateral de configuração */}
      <Sheet open={!!selectedGateway} onOpenChange={(open) => !open && setSelectedGateway(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0">
          {selectedGateway && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="text-lg">{selectedGateway.name}</SheetTitle>
                <SheetDescription className="text-sm">
                  {selectedGateway.subtitle}
                </SheetDescription>
              </SheetHeader>

              {!selectedGateway.hasRealIntegration && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  Integração em breve. As credenciais serão salvas para uso futuro.
                </div>
              )}

              <div className="flex-1 space-y-4 overflow-y-auto">
                {PAYMENT_GUIDES[selectedGateway.id] && <ProviderSetupGuide guide={PAYMENT_GUIDES[selectedGateway.id]} />}
                {selectedGateway.id === 'mercadopago' && (
                  <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    <p>A credencial fica protegida no cofre do sistema e nunca aparece nesta tela. Use “Testar conexão” após cadastrá-la.</p>
                  </div>
                )}
                {selectedGateway.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {field.label}
                    </Label>
                    <div className="relative">
                      <Input
                        type={field.type ?? 'text'}
                        value={fieldValues[field.key] ?? ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        className={field.secret ? 'font-mono text-sm pr-10' : 'font-mono text-sm'}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-6 border-t border-border mt-6">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || isSaving}
                  className="flex-1"
                >
                  {isTesting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Testando...</>
                  ) : (
                    <><Wifi className="h-4 w-4" />Testar Conexão</>
                  )}
                </Button>
                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    selectedGateway.id === 'mercadopago' ? 'Salvar configuração' : 'Salvar credenciais'
                  )}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

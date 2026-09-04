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
import { EMAIL_GUIDES } from './providerGuides';
import { TestMessageDialog } from './TestMessageDialog';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailTabProps {
  config: IntegrationsConfig;
  onSave: (config: IntegrationsConfig) => void;
  isSaving: boolean;
}

type EmailProvider = 'smtp' | 'resend' | 'sendgrid';

interface ProviderInfo {
  id: EmailProvider;
  name: string;
  description: string;
  initials: string;
  color: string;
  bgColor: string;
  badges: { label: string; type?: 'api' | 'smtp' }[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'smtp',
    name: 'Gmail SMTP',
    description: 'SMTP nativo para envio de emails',
    initials: 'GM',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    badges: [
      { label: 'SMTP', type: 'smtp' },
      { label: 'Transacional' },
    ],
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'API moderna para emails',
    initials: 'RS',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    badges: [
      { label: 'API', type: 'api' },
      { label: 'Transacional' },
      { label: 'Marketing' },
    ],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'API escalável para emails',
    initials: 'SG',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    badges: [
      { label: 'API', type: 'api' },
      { label: 'Transacional' },
      { label: 'Marketing' },
    ],
  },
];

function getBadgeClass(type?: string) {
  if (type === 'api') return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
  if (type === 'smtp') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
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
    const email = config.email;
    if (provider.id === 'smtp') return { ...email.smtp };
    if (provider.id === 'resend') return { ...email.resend };
    if (provider.id === 'sendgrid') return { ...email.sendgrid };
    return {};
  });

  const toggleShow = (f: string) =>
    setShowPasswords((p) => ({ ...p, [f]: !p[f] }));

  const handleSave = () => {
    const updated: IntegrationsConfig = {
      ...config,
      email: {
        ...config.email,
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
    hint?: string,
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
          {EMAIL_GUIDES[provider.id] && <ProviderSetupGuide guide={EMAIL_GUIDES[provider.id]} />}
          {provider.id === 'smtp' && (
            <>
              {field('host', 'Servidor SMTP', 'smtp.gmail.com')}
              {field('port', 'Porta', '587')}
              {field('user', 'Usuário / Email', 'seu@gmail.com')}
              {field('password', 'Senha de App', 'xxxx xxxx xxxx xxxx', true, 'Para Gmail, crie uma Senha de App em myaccount.google.com/apppasswords')}
            </>
          )}
          {provider.id === 'resend' && (
            <>
              {field('api_key', 'API Key', 're_xxxxxxxxxxxxxxxx', true, 'Obtenha em resend.com/api-keys')}
            </>
          )}
          {provider.id === 'sendgrid' && (
            <>
              {field('api_key', 'API Key', 'SG.xxxxxxxxxxxxxxxx', true, 'Obtenha em app.sendgrid.com/settings/api_keys')}
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

export function EmailTab({ config, onSave, isSaving }: EmailTabProps) {
  const [openProvider, setOpenProvider] = useState<EmailProvider | null>(null);
  const [fromName, setFromName] = useState(config.email.from_name);
  const [fromEmail, setFromEmail] = useState(config.email.from_email);
  const [testingSend, setTestingSend] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const { toast } = useToast();

  const activeProvider = config.email.active_provider;

  const isConfigured = (id: EmailProvider) => {
    const p = config.email[id] as any;
    return p && Object.values(p).some((v) => !!v);
  };

  const handleSaveFromFields = () => {
    onSave({
      ...config,
      email: { ...config.email, from_name: fromName, from_email: fromEmail },
    });
  };

  const handleTestEmail = async () => {
    if (!activeProvider || !fromEmail) {
      toast({ variant: 'destructive', title: 'Configure um provedor e email do remetente primeiro.' });
      return;
    }
    setTestingSend(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { config: config.email },
      });
      if (error) throw error;
      if (data?.ok) {
        toast({ title: 'Email de teste enviado com sucesso!' });
      } else {
        toast({ variant: 'destructive', title: 'Falha no envio', description: data?.error || 'Erro desconhecido' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar email de teste', description: e.message });
    } finally {
      setTestingSend(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Escolha e configure um provedor de email. Apenas um pode estar ativo por vez.
      </p>

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
                  <div className={`w-9 h-9 rounded-lg ${provider.bgColor} flex items-center justify-center shrink-0`}>
                    <span className={`text-sm font-bold ${provider.color}`}>{provider.initials}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm leading-tight">{provider.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{provider.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {provider.badges.map((b) => (
                    <Badge key={b.label} variant="outline" className={`text-xs py-0 ${getBadgeClass(b.type)}`}>
                      {b.label}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {active ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 text-xs"
                      onClick={() => setOpenProvider(provider.id)}
                    >
                      ✓ Configurado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onSave({ ...config, email: { ...config.email, active_provider: '' } })}
                    >
                      Desativar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={configured ? 'secondary' : 'outline'}
                    className="w-full text-xs"
                    onClick={() => setOpenProvider(provider.id)}
                  >
                    {configured ? 'Reconfigurar' : (
                      <>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Configurar
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Shared from fields */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from_name" className="text-xs tracking-wider uppercase font-medium">
                Nome do remetente
              </Label>
              <Input
                id="from_name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Minha Loja"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from_email" className="text-xs tracking-wider uppercase font-medium">
                Email do remetente
              </Label>
              <Input
                id="from_email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="contato@minhaloja.com"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setTestOpen(true)} disabled={!activeProvider}>
              <Send className="h-4 w-4 mr-2" />
              Enviar email de teste
            </Button>
            <Button size="sm" onClick={handleSaveFromFields} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <TestMessageDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        channel="email"
        providerLabel={PROVIDERS.find((p) => p.id === activeProvider)?.name}
      />

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

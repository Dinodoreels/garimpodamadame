import { useState } from 'react';
import { BadgeCheck, KeyRound, Mail, ReceiptText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationsConfig } from '@/hooks/useIntegrations';
import { TestMessageDialog } from './TestMessageDialog';

interface EmailTabProps {
  config: IntegrationsConfig;
  onSave: (config: IntegrationsConfig) => void;
  isSaving: boolean;
}

const services = [
  {
    icon: KeyRound,
    title: 'Acesso e recuperação de senha',
    description: 'Mensagens de acesso, convite e redefinição de senha.',
  },
  {
    icon: ReceiptText,
    title: 'Pedidos e pagamentos',
    description: 'Confirmações, recibos e atualizações enviadas pela loja.',
  },
  {
    icon: Mail,
    title: 'Notificações e campanhas',
    description: 'Avisos automáticos e mensagens criadas no painel.',
  },
];

export function EmailTab({ config: _config, onSave: _onSave, isSaving: _isSaving }: EmailTabProps) {
  const [testOpen, setTestOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">E-mail oficial de O Garimpo Digital</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Envio protegido pela infraestrutura da loja.</p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <BadgeCheck className="mr-1 h-3.5 w-3.5" />
              Ativo e verificado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Remetente oficial</p>
            <p className="mt-1 text-sm font-medium">O Garimpo Digital</p>
            <p className="text-sm text-muted-foreground">noreply@notify.ogarimpodigital.com.br</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {services.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3 rounded-md border border-border p-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Os e-mails usam o nome, a logo e os links oficiais da loja.</p>
            <Button size="sm" onClick={() => setTestOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Enviar e-mail de teste
            </Button>
          </div>
        </CardContent>
      </Card>

      <TestMessageDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        channel="email"
        providerLabel="E-mail oficial O Garimpo Digital"
      />
    </div>
  );
}
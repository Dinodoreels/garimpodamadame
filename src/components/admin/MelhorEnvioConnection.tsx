import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type ConnectionStatus = {
  credentials_configured: boolean;
  connected: boolean;
  account_name?: string | null;
  account_email?: string | null;
  last_error?: string | null;
  callback_url?: string;
};

export function MelhorEnvioConnection() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('melhor-envio-oauth-start', { body: { action: 'status' } });
    setLoading(false);
    if (error || !data?.ok) {
      toast({ variant: 'destructive', title: 'Não foi possível consultar a conexão', description: data?.error || 'Tente novamente.' });
      return;
    }
    setStatus(data);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const connect = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke('melhor-envio-oauth-start', { body: { action: 'start' } });
    setConnecting(false);
    if (error || !data?.ok || !data.url) {
      toast({ variant: 'destructive', title: 'Conexão não iniciada', description: data?.error || 'Confira as credenciais do aplicativo.' });
      return;
    }
    window.location.assign(data.url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-medium"><Truck className="h-5 w-5" />Conta Melhor Envio</CardTitle>
            <CardDescription>Conexão segura para cotação, etiquetas e rastreamento das vendas do site.</CardDescription>
          </div>
          {status?.connected && <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />Conectado</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando conexão…</div> : (
          <>
            {status?.connected ? (
              <Alert><ShieldCheck className="h-4 w-4" /><AlertTitle>{status.account_name || 'Conta autorizada'}</AlertTitle><AlertDescription>{status.account_email || 'O acesso será renovado automaticamente.'}</AlertDescription></Alert>
            ) : status?.credentials_configured ? (
              <Alert><AlertTitle>Aplicativo pronto para conectar</AlertTitle><AlertDescription>Autorize a conta do Melhor Envio para ativar as operações no painel.</AlertDescription></Alert>
            ) : (
              <Alert><AlertTitle>Aguardando o cadastro do aplicativo</AlertTitle><AlertDescription>Depois de cadastrar o aplicativo, salve o Client ID e o Client Secret no formulário seguro.</AlertDescription></Alert>
            )}
            {status?.last_error && <Alert variant="destructive"><AlertTitle>Última tentativa</AlertTitle><AlertDescription>{status.last_error}</AlertDescription></Alert>}
            {status?.callback_url && <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Endereço de retorno</p><code className="block overflow-x-auto bg-muted p-2 text-xs">{status.callback_url}</code></div>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={connect} disabled={connecting || !status?.credentials_configured}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}{status?.connected ? 'Reconectar conta' : 'Conectar com Melhor Envio'}</Button>
              <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4" />Atualizar situação</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
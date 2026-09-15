import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type CallbackState = 'loading' | 'success' | 'error';

export default function MelhorEnvioCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Confirmando a autorização com o Melhor Envio…');

  useEffect(() => {
    const finish = async () => {
      const code = searchParams.get('code');
      const oauthState = searchParams.get('state');
      const providerError = searchParams.get('error');
      const providerDescription = searchParams.get('error_description');
      const { data, error } = await supabase.functions.invoke('melhor-envio-oauth-callback', {
        body: { code, state: oauthState, error: providerError, error_description: providerDescription },
      });
      if (error || !data?.ok) {
        setState('error');
        setMessage(data?.error || 'Não foi possível concluir a conexão. Tente novamente pelo painel.');
        return;
      }
      setState('success');
      setMessage(data.account_name ? `Conta ${data.account_name} conectada com sucesso.` : 'Conta conectada com sucesso.');
      window.setTimeout(() => navigate('/admin/settings?section=shipping&melhor_envio=ok', { replace: true }), 1800);
    };
    void finish();
  }, [navigate, searchParams]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-md border border-border bg-card p-6 text-center shadow-sm">
        {state === 'loading' && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
        {state === 'success' && <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />}
        {state === 'error' && <XCircle className="mx-auto h-10 w-10 text-destructive" />}
        <h1 className="mt-4 text-xl font-semibold">Conexão com Melhor Envio</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {state !== 'loading' && <Button className="mt-6" onClick={() => navigate('/admin/settings?section=shipping', { replace: true })}>Voltar às configurações</Button>}
      </section>
    </main>
  );
}
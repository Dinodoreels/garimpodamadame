import { useEffect, useState } from 'react';
import { FileCheck2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Consent = { id: string; document_key: string; document_version: string; accepted_at: string; source: string };
type CookieChoice = { id: string; policy_version: string; analytics: boolean; marketing: boolean; action: string; created_at: string };

const labels: Record<string, string> = { terms: 'Termos de Uso', privacy: 'Política de Privacidade' };

export function UserConsentHistory() {
  const [items, setItems] = useState<Consent[]>([]);
  const [cookies, setCookies] = useState<CookieChoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('user_legal_consents').select('id, document_key, document_version, accepted_at, source').order('accepted_at', { ascending: false }),
      supabase.from('cookie_consent_log').select('id, policy_version, analytics, marketing, action, created_at').order('created_at', { ascending: false }).limit(10),
    ]).then(([legal, cookie]) => { setItems(legal.data ?? []); setCookies(cookie.data ?? []); setLoading(false); });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" /> Aceites legais</CardTitle>
        <CardDescription>Histórico das versões que você confirmou.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aceite registrado.</p>
        ) : items.map(item => (
          <div key={item.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium">{labels[item.document_key] ?? item.document_key}</p><p className="text-xs text-muted-foreground">Versão {item.document_version}</p></div>
            <time className="text-xs text-muted-foreground">{new Date(item.accepted_at).toLocaleString('pt-BR')}</time>
          </div>
        ))}
        {cookies.length > 0 && <div className="border-t pt-3"><p className="mb-2 text-sm font-medium">Escolhas de cookies recentes</p>{cookies.map(item => <div key={item.id} className="mb-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')} · versão {item.policy_version} · analytics {item.analytics ? 'sim' : 'não'} · marketing {item.marketing ? 'sim' : 'não'}</div>)}</div>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm"><a href="/termos">Ver Termos</a></Button>
          <Button asChild variant="outline" size="sm"><a href="/privacidade">Ver Privacidade</a></Button>
          <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}>Gerenciar cookies</Button>
        </div>
      </CardContent>
    </Card>
  );
}
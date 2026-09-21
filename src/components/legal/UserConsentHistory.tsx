import { useEffect, useState } from 'react';
import { ChevronDown, FileCheck2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type Consent = { id: string; document_key: string; document_version: string; accepted_at: string; source: string };
type CookieChoice = { id: string; policy_version: string; analytics: boolean; marketing: boolean; action: string; created_at: string };

const labels: Record<string, string> = { terms: 'Termos de Uso', privacy: 'Política de Privacidade' };

export function UserConsentHistory() {
  const [items, setItems] = useState<Consent[]>([]);
  const [cookies, setCookies] = useState<CookieChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('user_legal_consents').select('id, document_key, document_version, accepted_at, source').order('accepted_at', { ascending: false }),
      supabase.from('cookie_consent_log').select('id, policy_version, analytics, marketing, action, created_at').order('created_at', { ascending: false }).limit(10),
    ]).then(([legal, cookie]) => { setItems(legal.data ?? []); setCookies(cookie.data ?? []); setLoading(false); });
  }, []);

  const latestLegalConsent = items[0];
  const latestCookieChoice = cookies[0];

  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-0.5 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileCheck2 className="h-4 w-4" /> Aceites legais
        </CardTitle>
        <CardDescription className="text-xs">Documentos e preferências confirmados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-3">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aceite registrado.</p>
        ) : (
          <div className="text-xs text-muted-foreground">
            Último aceite em {new Date(latestLegalConsent.accepted_at).toLocaleDateString('pt-BR')} · versão {latestLegalConsent.document_version}
          </div>
        )}
        {latestCookieChoice && (
          <p className="text-xs text-muted-foreground">
            Cookies: análise {latestCookieChoice.analytics ? 'permitida' : 'desativada'} · marketing {latestCookieChoice.marketing ? 'permitido' : 'desativado'}
          </p>
        )}

        {(items.length > 0 || cookies.length > 0) && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-0 text-xs text-muted-foreground">
                {historyOpen ? 'Ocultar histórico' : 'Ver histórico'}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 border-t pt-2">
              {items.map(item => (
                <div key={item.id} className="flex flex-col gap-0.5 border-b pb-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium">{labels[item.document_key] ?? item.document_key}</p>
                    <p className="text-xs text-muted-foreground">Versão {item.document_version}</p>
                  </div>
                  <time className="text-xs text-muted-foreground">{new Date(item.accepted_at).toLocaleString('pt-BR')}</time>
                </div>
              ))}
              {cookies.length > 0 && (
                <div className="border-t pt-2">
                  <p className="mb-1.5 text-xs font-medium">Histórico de cookies</p>
                  {cookies.map(item => (
                    <div key={item.id} className="mb-1 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString('pt-BR')} · análise {item.analytics ? 'sim' : 'não'} · marketing {item.marketing ? 'sim' : 'não'}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex flex-wrap gap-1 border-t pt-2">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs"><a href="/termos">Termos</a></Button>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs"><a href="/privacidade">Privacidade</a></Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}>Cookies</Button>
        </div>
      </CardContent>
    </Card>
  );
}
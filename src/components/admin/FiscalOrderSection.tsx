import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileCheck2, Loader2, Printer, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const labels: Record<string, string> = { pending_data: 'Dados pendentes', ready: 'Pronta para emitir', processing: 'Processando', authorized: 'Autorizada', rejected: 'Rejeitada', cancelled: 'Cancelada', error: 'Erro' };
const categoryLabels: Record<string, string> = { empresa: 'Empresa', bling: 'Bling', produto: 'Produtos', cliente: 'Cliente', pedido: 'Pedido', pagamento: 'Pagamento' };

export function FiscalOrderSection({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const [document, setDocument] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase.from('fiscal_documents').select('*').eq('order_id', orderId).maybeSingle();
    setDocument(data);
    if (data?.id) {
      const { data: history } = await supabase.from('fiscal_document_events').select('*').eq('fiscal_document_id', data.id).order('created_at', { ascending: false });
      setEvents(history ?? []);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const action = async (name: 'prepare' | 'issue' | 'sync') => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('bling-fiscal-document', { body: { order_id: orderId, action: name } });
    setLoading(false);
    if (error || !data?.ok) toast({ variant: 'destructive', title: 'Nota fiscal não concluída', description: data?.error || 'Confira os dados e tente novamente.' });
    else toast({ title: name === 'issue' ? 'Emissão enviada ao Bling' : 'Situação fiscal atualizada' });
    await load();
  };

  const errors = Array.isArray(document?.validation_errors) ? document.validation_errors.map((item: any) => typeof item === 'string' ? { label: item } : item) : [];
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" /><h3 className="font-medium">Nota fiscal</h3></div>{document && <Badge variant="outline">{labels[document.status] ?? document.status}</Badge>}</div>
    {!document && <Alert><AlertTitle>Nota ainda não preparada</AlertTitle><AlertDescription>Valide os dados do cliente e do pedido antes de enviar ao Bling.</AlertDescription></Alert>}
    {errors.length > 0 && <Alert variant="destructive"><AlertTitle>Falta corrigir</AlertTitle><AlertDescription><ul className="mt-2 space-y-2">{errors.map((error: any, index: number) => <li key={`${error.label}-${index}`} className="flex items-start justify-between gap-3"><span><strong>{categoryLabels[error.category] ? `${categoryLabels[error.category]}: ` : ''}</strong>{error.label}</span>{error.fix_path && <Button variant="link" size="sm" asChild className="h-auto p-0"><Link to={error.fix_path}>Corrigir</Link></Button>}</li>)}</ul></AlertDescription></Alert>}
    {document?.error_message && <Alert variant="destructive"><AlertTitle>Retorno do Bling</AlertTitle><AlertDescription>{document.error_message}</AlertDescription></Alert>}
    {document?.status === 'authorized' && <div className="grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Número:</span> {document.invoice_number || '—'}</p><p><span className="text-muted-foreground">Chave:</span> {document.access_key || '—'}</p></div>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => action('prepare')} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Validar dados</Button>
      {document?.status === 'ready' && ['paid', 'processing', 'shipped', 'delivered'].includes(orderStatus) && <Button size="sm" onClick={() => action('issue')} disabled={loading}><FileCheck2 className="h-4 w-4" />Emitir pelo Bling</Button>}
      {document?.bling_invoice_id && <Button variant="outline" size="sm" onClick={() => action('sync')} disabled={loading}><RefreshCw className="h-4 w-4" />Consultar no Bling</Button>}
      {document?.danfe_url && <Button variant="outline" size="sm" asChild><a href={document.danfe_url} target="_blank" rel="noreferrer"><Printer className="h-4 w-4" />DANFE</a></Button>}
      {document?.xml_url && <Button variant="outline" size="sm" asChild><a href={document.xml_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />XML</a></Button>}
    </div>
    <p className="text-xs text-muted-foreground">“Validar dados” apenas confere e registra pendências. Não cria nem envia nota fiscal.</p>
    {events.length > 0 && <div className="space-y-2 border-t pt-3"><p className="text-xs uppercase text-muted-foreground">Histórico fiscal</p>{events.slice(0, 6).map((event) => <div key={event.id} className="text-xs"><span className="font-medium">{labels[event.status] ?? event.status}</span>{event.message ? ` — ${event.message}` : ''}</div>)}</div>}
  </div>;
}
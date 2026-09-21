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

export function FiscalOrderSection({ orderId, orderStatus, orderSource }: { orderId: string; orderStatus: string; orderSource: string }) {
  const [document, setDocument] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isMarketplace = orderSource.startsWith('bling:');

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

  const openStoredDanfe = async () => {
    if (!document?.danfe_storage_path) return;
    const target = window.open('', '_blank');
    if (!target) {
      toast({ variant: 'destructive', title: 'O navegador bloqueou o arquivo', description: 'Permita novas abas para este site.' });
      return;
    }
    const { data, error } = await supabase.storage.from('shipping-labels').createSignedUrl(document.danfe_storage_path, 300);
    if (error || !data?.signedUrl) {
      target.close();
      toast({ variant: 'destructive', title: 'Não foi possível abrir o DANFE' });
      return;
    }
    target.opener = null;
    target.location.href = data.signedUrl;
  };

  const errors = Array.isArray(document?.validation_errors) ? document.validation_errors.map((item: any) => typeof item === 'string' ? { label: item } : item) : [];
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" /><h3 className="font-medium">Nota fiscal</h3></div>{document && <Badge variant="outline">{labels[document.status] ?? document.status}</Badge>}</div>
    {!document && <Alert><AlertTitle>{isMarketplace ? 'Nota da plataforma ainda não localizada' : 'Nota ainda não preparada'}</AlertTitle><AlertDescription>{isMarketplace ? 'A busca consulta no Bling a nota já emitida para este pedido, sem criar outra.' : 'A emissão será automática após o pagamento quando todos os dados fiscais estiverem corretos.'}</AlertDescription></Alert>}
    {errors.length > 0 && <Alert variant="destructive"><AlertTitle>Falta corrigir</AlertTitle><AlertDescription><ul className="mt-2 space-y-2">{errors.map((error: any, index: number) => <li key={`${error.label}-${index}`} className="flex items-start justify-between gap-3"><span><strong>{categoryLabels[error.category] ? `${categoryLabels[error.category]}: ` : ''}</strong>{error.label}</span>{error.fix_path && <Button variant="link" size="sm" asChild className="h-auto p-0"><Link to={error.fix_path}>Corrigir</Link></Button>}</li>)}</ul></AlertDescription></Alert>}
    {document?.error_message && <Alert variant="destructive"><AlertTitle>Retorno do Bling</AlertTitle><AlertDescription>{document.error_message}</AlertDescription></Alert>}
    {document?.status === 'authorized' && <div className="grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Número:</span> {document.invoice_number || '—'}</p><p><span className="text-muted-foreground">Chave:</span> {document.access_key || '—'}</p></div>}
    {document?.upload_source === 'manual_tiktok_batch' && <p className="text-xs text-muted-foreground">DANFE oficial do TikTok vinculado pelo rastreamento em {new Date(document.uploaded_at).toLocaleString('pt-BR')}.</p>}
    <div className="flex flex-wrap gap-2">
       <Button variant="outline" size="sm" onClick={() => action(isMarketplace ? 'sync' : 'prepare')} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{isMarketplace ? 'Buscar nota da plataforma' : 'Validar dados'}</Button>
       {!isMarketplace && document?.status === 'ready' && ['paid', 'processing', 'shipped', 'delivered'].includes(orderStatus) && <Badge variant="secondary">Emissão automática pronta</Badge>}
       {document?.bling_invoice_id && <Button variant="outline" size="sm" onClick={() => action('sync')} disabled={loading}><RefreshCw className="h-4 w-4" />Consultar no Bling</Button>}
       {document?.status === 'authorized' && document?.danfe_url && <Button variant="outline" size="sm" asChild><a href={document.danfe_url} target="_blank" rel="noreferrer"><Printer className="h-4 w-4" />Imprimir DANFE</a></Button>}
       {document?.danfe_storage_path && <Button variant="outline" size="sm" onClick={() => void openStoredDanfe()}><Printer className="h-4 w-4" />Abrir DANFE do TikTok</Button>}
      {document?.xml_url && <Button variant="outline" size="sm" asChild><a href={document.xml_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />XML</a></Button>}
    </div>
    <p className="text-xs text-muted-foreground">{isMarketplace ? 'Esta área nunca emite outra nota para pedidos de marketplace; apenas recupera o documento oficial existente.' : 'A validação não emite nota. A emissão automática só ocorre após pagamento e aprovação de todos os dados fiscais.'}</p>
    {events.length > 0 && <div className="space-y-2 border-t pt-3"><p className="text-xs uppercase text-muted-foreground">Histórico fiscal</p>{events.slice(0, 6).map((event) => <div key={event.id} className="text-xs"><span className="font-medium">{labels[event.status] ?? event.status}</span>{event.message ? ` — ${event.message}` : ''}</div>)}</div>}
  </div>;
}
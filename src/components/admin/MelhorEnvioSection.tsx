import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, PackageCheck, Printer, RefreshCw, ShoppingCart, Truck, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const statusLabels: Record<string, string> = { draft: 'Aguardando conferência', pending_review: 'Aguardando revisão', awaiting_data: 'Aguardando dados', awaiting_invoice: 'Aguardando nota fiscal', ready: 'Pronto para compra', processing: 'Comprando', cart: 'No carrinho', purchased: 'Comprada', label_ready: 'Etiqueta pronta', label_generated: 'Etiqueta pronta', posted: 'Postado', in_transit: 'Em trânsito', delivered: 'Entregue', cancelled: 'Cancelado', error: 'Erro' };

export function MelhorEnvioSection({ orderId, source, service, carrier, estimate }: { orderId: string; source?: string | null; service?: string | null; carrier?: string | null; estimate?: number | null }) {
  const [shipment, setShipment] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const isWebsite = source === 'website';

  const load = useCallback(async () => {
    const { data } = await supabase.from('melhor_envio_shipments').select('*').eq('order_id', orderId).maybeSingle();
    setShipment(data);
    if (data?.id) {
      const { data: history } = await supabase.from('melhor_envio_shipment_events').select('*').eq('shipment_id', data.id).order('created_at', { ascending: false });
      setEvents(history ?? []);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  if (!isWebsite) return <Alert><Truck className="h-4 w-4" /><AlertTitle>Frete gerenciado pela plataforma</AlertTitle><AlertDescription>Este pedido veio do Bling ou de um marketplace. O Melhor Envio não fará alterações nele.</AlertDescription></Alert>;

  const action = async (name: 'auto_check' | 'prepare' | 'purchase' | 'generate' | 'print' | 'sync' | 'cancel') => {
    const printWindow = name === 'print' ? window.open('', '_blank') : null;
    if (name === 'print' && !printWindow) {
      toast({ variant: 'destructive', title: 'Impressão bloqueada', description: 'Permita novas abas para este site e tente novamente.' });
      return;
    }
    setLoading(name);
    const { data, error } = name === 'auto_check'
      ? await supabase.functions.invoke('melhor-envio-auto', { body: { order_id: orderId } })
      : await supabase.functions.invoke('melhor-envio', { body: { action: name, order_id: orderId } });
    setLoading(null);
    if (error || !data?.ok) {
      if (printWindow && !printWindow.closed) printWindow.close();
      toast({ variant: 'destructive', title: 'Operação não concluída', description: data?.error || 'Confira os dados e tente novamente.' });
      return;
    }
    if (name === 'print' && data.url && printWindow) printWindow.location.href = data.url;
    toast({ title: name === 'purchase' ? 'Etiqueta comprada' : 'Envio atualizado' });
    await load();
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Truck className="h-5 w-5" /><h3 className="font-medium">Melhor Envio</h3></div>{shipment && <Badge variant="outline">{statusLabels[shipment.validation_status] ?? statusLabels[shipment.status] ?? shipment.status}</Badge>}</div>
    {(service || carrier) && <div className="grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Serviço:</span> {[carrier, service].filter(Boolean).join(' — ')}</p><p><span className="text-muted-foreground">Prazo:</span> {estimate ? `${estimate} dias úteis` : '—'}</p></div>}
    {!shipment && <Alert><AlertTitle>Postagem ainda não preparada</AlertTitle><AlertDescription>Confira os dados do pedido antes de adicioná-lo ao carrinho do Melhor Envio.</AlertDescription></Alert>}
    {shipment?.last_error && <Alert variant="destructive"><AlertTitle>Último erro</AlertTitle><AlertDescription>{shipment.last_error}</AlertDescription></Alert>}
    {Array.isArray(shipment?.validation_errors) && shipment.validation_errors.length > 0 && <Alert><AlertTitle>Pendências para liberar a etiqueta</AlertTitle><AlertDescription><ul className="list-disc pl-5">{shipment.validation_errors.map((item: string) => <li key={item}>{item}</li>)}</ul></AlertDescription></Alert>}
    <div className="flex flex-wrap gap-2">
      {(!shipment || ['awaiting_data', 'awaiting_invoice', 'error', 'pending_review'].includes(shipment.validation_status)) && <Button size="sm" onClick={() => action('auto_check')} disabled={!!loading}>{loading === 'auto_check' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Conferir novamente</Button>}
      {!shipment && <Button size="sm" variant="outline" onClick={() => action('prepare')} disabled={!!loading}>{loading === 'prepare' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}Preparar postagem</Button>}
      {shipment?.status === 'cart' && <AlertDialog><AlertDialogTrigger asChild><Button size="sm" disabled={!!loading}><PackageCheck className="h-4 w-4" />Comprar etiqueta</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar compra da etiqueta?</AlertDialogTitle><AlertDialogDescription>Esta ação consumirá o saldo da sua conta Melhor Envio. Confira serviço, endereço, peso e dimensões antes de continuar.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => action('purchase')}>Confirmar compra</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      {shipment?.status === 'purchased' && <Button size="sm" onClick={() => action('generate')} disabled={!!loading}><PackageCheck className="h-4 w-4" />Gerar etiqueta</Button>}
      {shipment?.label_generated_at && <Button size="sm" variant="outline" onClick={() => action('print')} disabled={!!loading}><Printer className="h-4 w-4" />Imprimir etiqueta</Button>}
      {shipment?.purchased_at && !['cancelled', 'delivered'].includes(shipment.status) && <Button size="sm" variant="outline" onClick={() => action('sync')} disabled={!!loading}><RefreshCw className="h-4 w-4" />Atualizar rastreio</Button>}
      {shipment?.tracking_url && <Button size="sm" variant="outline" asChild><a href={shipment.tracking_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Abrir rastreio</a></Button>}
      {shipment && !['cancelled', 'delivered'].includes(shipment.status) && <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive" disabled={!!loading}><XCircle className="h-4 w-4" />Cancelar envio</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar este envio?</AlertDialogTitle><AlertDialogDescription>O pedido será cancelado no Melhor Envio. O pedido da loja e seu histórico serão preservados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => action('cancel')}>Cancelar envio</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
    </div>
    {events.length > 0 && <div className="space-y-2 border-t pt-3"><p className="text-xs uppercase text-muted-foreground">Histórico do envio</p>{events.slice(0, 8).map(event => <div key={event.id} className="text-xs"><span className="font-medium">{statusLabels[event.status] ?? event.status}</span>{event.message ? ` — ${event.message}` : ''}</div>)}</div>}
  </div>;
}
import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileText, Loader2, Package, Printer, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { AdminOrder } from '@/hooks/useAdminData';
import { toast } from 'sonner';

interface LabelPrintCenterProps {
  orders: AdminOrder[];
}

function openPrintWindow() {
  const target = window.open('', '_blank');
  if (!target) toast.error('O navegador bloqueou a impressão. Permita novas abas para este site.');
  return target;
}

function closePrintWindow(target: Window | null) {
  if (target && !target.closed) target.close();
}

export function LabelPrintCenter({ orders }: LabelPrintCenterProps) {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState<'marketplace' | 'melhor-envio' | null>(null);

  const counts = useMemo(() => {
    const marketplace = orders.filter(order => String(order.source ?? '').startsWith('bling:'));
    const melhorEnvio = orders.filter(order => order.source === 'website' && order.melhor_envio_shipment);
    return {
      marketplace,
      marketplaceReady: marketplace.filter(order => order.marketplace_shipping_label?.status === 'ready' && order.marketplace_shipping_label?.label_url).length,
      melhorEnvio,
      melhorEnvioReady: melhorEnvio.filter(order => order.melhor_envio_shipment?.label_generated_at).length,
    };
  }, [orders]);

  const printMarketplace = async () => {
    const orderIds = counts.marketplace.map(order => order.id).slice(0, 50);
    if (!orderIds.length) return toast.error('Nenhum pedido de plataforma nos filtros atuais.');
    const target = openPrintWindow();
    if (!target) return;
    setPrinting('marketplace');
    try {
      const { data: syncData, error: syncError } = await supabase.functions.invoke('bling-marketplace-labels', { body: { action: 'sync', order_ids: orderIds } });
      if (syncError || syncData?.error) throw new Error(syncData?.error || syncError?.message);
      const { data, error } = await supabase.functions.invoke('bling-marketplace-labels', { body: { action: 'batch_pdf', order_ids: orderIds } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (!data?.pdf_base64) {
        closePrintWindow(target);
        toast.info(data?.message || 'As plataformas ainda não liberaram etiquetas oficiais.');
        return;
      }
      const binary = atob(data.pdf_base64);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      target.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      const unavailable = (data.pending?.length ?? 0) + (data.failed?.length ?? 0);
      toast.success(`${data.included?.length ?? 0} etiqueta(s) oficial(is) preparada(s)${unavailable ? `; ${unavailable} aguardando liberação` : ''}.`);
    } catch (error) {
      closePrintWindow(target);
      toast.error(error instanceof Error ? error.message : 'Não foi possível preparar as etiquetas das plataformas.');
    } finally {
      setPrinting(null);
    }
  };

  const printMelhorEnvio = async () => {
    const orderIds = counts.melhorEnvio.filter(order => order.melhor_envio_shipment?.label_generated_at).map(order => order.id).slice(0, 50);
    if (!orderIds.length) return toast.error('Nenhuma etiqueta do Melhor Envio está pronta nos filtros atuais.');
    const target = openPrintWindow();
    if (!target) return;
    setPrinting('melhor-envio');
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio', { body: { action: 'print_batch', order_ids: orderIds } });
      if (error || !data?.ok || !data?.url) throw new Error(data?.error || 'O Melhor Envio não retornou o arquivo oficial.');
      target.location.href = data.url;
      toast.success(`${data.count ?? orderIds.length} etiqueta(s) do Melhor Envio preparada(s).`);
    } catch (error) {
      closePrintWindow(target);
      toast.error(error instanceof Error ? error.message : 'Não foi possível preparar as etiquetas do Melhor Envio.');
    } finally {
      setPrinting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Printer className="mr-2 h-4 w-4" />Imprimir etiquetas</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Central de etiquetas oficiais</DialogTitle>
          <DialogDescription>Imprima os arquivos liberados pela transportadora ou pela plataforma, sem alterar tamanho, código ou conteúdo.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-4 border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3"><ShoppingBag className="mt-0.5 h-5 w-5" /><div><h3 className="font-medium">TikTok e outras plataformas</h3><p className="text-xs text-muted-foreground">PDF oficial recebido pela integração</p></div></div>
              <span className="text-sm font-medium">{counts.marketplaceReady}/{counts.marketplace.length}</span>
            </div>
            <div className="aspect-[1/1.41] max-h-48 border bg-muted/30 p-4">
              <div className="flex h-full flex-col justify-between border border-dashed bg-background p-3 text-xs">
                <div className="flex items-center justify-between"><strong>ETIQUETA DA PLATAFORMA</strong><FileText className="h-4 w-4" /></div>
                <div className="space-y-1 text-muted-foreground"><div className="h-2 w-3/4 bg-muted" /><div className="h-2 w-1/2 bg-muted" /><div className="h-8 w-full bg-muted" /></div>
                <p className="text-center text-[10px] text-muted-foreground">O conteúdo real vem no PDF oficial.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{counts.marketplaceReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4" />}{counts.marketplaceReady} pronta(s) para impressão em massa</div>
            <Button className="w-full" onClick={() => void printMarketplace()} disabled={printing !== null || !counts.marketplace.length}>
              {printing === 'marketplace' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}Imprimir plataformas em massa
            </Button>
          </section>

          <section className="space-y-4 border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3"><Package className="mt-0.5 h-5 w-5" /><div><h3 className="font-medium">Melhor Envio</h3><p className="text-xs text-muted-foreground">PDF oficial da transportadora contratada</p></div></div>
              <span className="text-sm font-medium">{counts.melhorEnvioReady}/{counts.melhorEnvio.length}</span>
            </div>
            <div className="aspect-[1/1.41] max-h-48 border bg-muted/30 p-4">
              <div className="flex h-full flex-col justify-between border border-dashed bg-background p-3 text-xs">
                <div className="flex items-center justify-between"><strong>ETIQUETA DE ENVIO</strong><FileText className="h-4 w-4" /></div>
                <div className="space-y-1 text-muted-foreground"><div className="h-2 w-2/3 bg-muted" /><div className="h-2 w-full bg-muted" /><div className="h-8 w-full bg-muted" /></div>
                <p className="text-center text-[10px] text-muted-foreground">Endereço e código vêm do Melhor Envio.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{counts.melhorEnvioReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4" />}{counts.melhorEnvioReady} pronta(s) para impressão em massa</div>
            <Button className="w-full" onClick={() => void printMelhorEnvio()} disabled={printing !== null || !counts.melhorEnvioReady}>
              {printing === 'melhor-envio' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}Imprimir Melhor Envio em massa
            </Button>
          </section>
        </div>
        <p className="text-xs text-muted-foreground">São considerados somente os pedidos exibidos pelos filtros atuais, até 50 por impressão. Etiquetas ainda não liberadas permanecem aguardando.</p>
      </DialogContent>
    </Dialog>
  );
}
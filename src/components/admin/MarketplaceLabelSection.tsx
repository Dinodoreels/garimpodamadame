import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Printer, RefreshCw, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ManualTikTokLabelUpload } from './ManualTikTokLabelUpload';

interface MarketplaceLabelSectionProps {
  orderId: string;
  orderNumber: string;
  source?: string | null;
  label?: any;
}

export function MarketplaceLabelSection({ orderId, orderNumber, source, label: initialLabel }: MarketplaceLabelSectionProps) {
  const [label, setLabel] = useState<any>(initialLabel ?? null);
  const [loading, setLoading] = useState(false);
  const normalizedSource = String(source ?? '').toLowerCase();
  const isMarketplace = normalizedSource.startsWith('bling:') || normalizedSource.includes('tiktok');
  const isManual = String(label?.upload_source ?? '').startsWith('manual_tiktok');

  const load = useCallback(async (showToast = false) => {
    if (!isMarketplace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bling-marketplace-labels', {
        body: { action: 'sync', order_ids: [orderId] },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      const next = data?.results?.[0] ?? null;
      if (next) setLabel(next);
      if (showToast) toast.success(next?.status === 'ready' ? 'Etiqueta pronta para impressão' : 'A plataforma ainda não liberou a etiqueta');
    } catch (error) {
      if (showToast) toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a etiqueta');
    } finally {
      setLoading(false);
    }
  }, [isMarketplace, orderId]);

  useEffect(() => {
    setLabel(initialLabel ?? null);
    if (isMarketplace && (!initialLabel || initialLabel.status !== 'ready')) void load(false);
  }, [initialLabel, isMarketplace, load]);

  if (!isMarketplace) return null;

  const print = async () => {
    if (!label?.label_url && !label?.storage_path) return;
    const target = window.open('', '_blank');
    if (!target) {
      toast.error('O navegador bloqueou a impressão. Permita novas abas para este site.');
      return;
    }
    let url = label.label_url;
    if (label.storage_path) {
      const { data, error } = await supabase.storage.from('shipping-labels').createSignedUrl(label.storage_path, 300);
      if (error || !data?.signedUrl) {
        target.close();
        toast.error('Não foi possível abrir o PDF enviado.');
        return;
      }
      url = data.signedUrl;
    }
    target.opener = null;
    target.location.href = url;
    await supabase.functions.invoke('bling-marketplace-labels', { body: { action: 'mark_printed', order_ids: [orderId] } });
    setLabel((current: any) => ({ ...current, printed_at: new Date().toISOString() }));
  };

  return (
    <div className="space-y-3 border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          <div>
            <p className="text-sm font-medium">Etiqueta da plataforma</p>
            <p className="text-xs text-muted-foreground">Separada das etiquetas do Melhor Envio</p>
          </div>
        </div>
        <Badge variant="outline">{label?.printed_at ? 'Impressa' : label?.status === 'ready' ? 'Pronta' : label?.status === 'error' ? 'Erro' : 'Aguardando plataforma'}</Badge>
      </div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <span>Plataforma: <strong className="text-foreground">{label?.platform || 'Marketplace'}</strong></span>
        <span>Formato: <strong className="text-foreground">{label?.format || 'PDF'}</strong></span>
        <span>Tentativas: <strong className="text-foreground">{label?.attempts || 0}</strong></span>
      </div>
      {(label?.provider_note || label?.last_error) && <p className="text-xs text-muted-foreground">{label.provider_note || label.last_error}</p>}
      {isManual && label?.uploaded_at && <p className="text-xs text-muted-foreground">Enviada manualmente em {new Date(label.uploaded_at).toLocaleString('pt-BR')}.</p>}
      <p className="text-xs text-muted-foreground">Use o PDF original sem recortar, editar ou redimensionar. O tamanho correto é definido pela própria plataforma.</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button size="sm" onClick={() => void print()} disabled={!label?.label_url && !label?.storage_path}>
          {label?.printed_at ? <ExternalLink className="mr-2 h-4 w-4" /> : <Printer className="mr-2 h-4 w-4" />}
          {label?.printed_at ? 'Abrir novamente' : 'Abrir e imprimir'}
        </Button>
        <ManualTikTokLabelUpload
          compact
          orderId={orderId}
          orderNumber={orderNumber}
          source={source}
          blingOrderId={label?.bling_order_id}
          label={label}
          onChanged={setLabel}
        />
      </div>
    </div>
  );
}
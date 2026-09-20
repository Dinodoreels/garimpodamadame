import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Printer, RefreshCw, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketplaceLabelSectionProps {
  orderId: string;
  source?: string | null;
  label?: any;
}

export function MarketplaceLabelSection({ orderId, source, label: initialLabel }: MarketplaceLabelSectionProps) {
  const [label, setLabel] = useState<any>(initialLabel ?? null);
  const [loading, setLoading] = useState(false);
  const isMarketplace = String(source ?? '').startsWith('bling:');

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
    if (!label?.label_url) return;
    window.open(label.label_url, '_blank', 'noopener,noreferrer');
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
      <p className="text-xs text-muted-foreground">Use o PDF original sem recortar, editar ou redimensionar. O tamanho correto é definido pela própria plataforma.</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button size="sm" onClick={() => void print()} disabled={!label?.label_url}>
          {label?.printed_at ? <ExternalLink className="mr-2 h-4 w-4" /> : <Printer className="mr-2 h-4 w-4" />}
          {label?.printed_at ? 'Abrir novamente' : 'Abrir e imprimir'}
        </Button>
      </div>
    </div>
  );
}
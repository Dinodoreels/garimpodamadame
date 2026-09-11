import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { workflowService } from '@/services/inbound/workflowService';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Check } from 'lucide-react';

interface PendingRow {
  id: string;
  item_id: string;
  reason: string;
  ai_suggestions: Record<string, unknown> | null;
  created_at: string;
  inbound_items: {
    id: string; title: string | null; brand: string | null; barcode: string | null;
    sku: string | null; quantity: number; ai_confidence: number | null;
    lots: { code: string } | null;
  } | null;
}

const REASONS: Record<string, string> = {
  low_confidence: 'IA sem certeza',
  no_match: 'Sem correspondência no catálogo',
  manual: 'Enviado para conferência',
};

export default function InboundPendings() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { title: string; sku: string }>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['inbound', 'pendings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbound_pendings' as never)
        .select('id, item_id, reason, ai_suggestions, created_at, inbound_items(id, title, brand, barcode, sku, quantity, ai_confidence, lots(code))')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PendingRow[];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ row, title, sku }: { row: PendingRow; title: string; sku: string }) => {
      await workflowService.resolvePending(row.id, row.item_id, title, sku);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbound'] });
      toast.success('Peça identificada.');
    },
    onError: (e: Error) => toast.error('Não foi possível concluir', { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Pendências" subtitle="Peças que a IA não conseguiu identificar com segurança" />

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Check className="h-12 w-12 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
          <p>Nenhuma pendência</p>
          <p className="text-sm mt-1">Tudo que foi bipado já está identificado.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(row => {
            const item = row.inbound_items;
            const draft = drafts[row.id] ?? { title: item?.title ?? '', sku: item?.sku ?? '' };
            return (
              <Card key={row.id}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> {REASONS[row.reason] ?? row.reason}
                    </Badge>
                    {item?.lots?.code && <Badge variant="secondary">{item.lots.code}</Badge>}
                    {item?.ai_confidence != null && (
                      <span className="text-xs text-muted-foreground">
                        confiança {Math.round(item.ai_confidence * 100)}%
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {item?.barcode ? `Código ${item.barcode} · ` : ''}{item?.quantity ?? 1} un.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>O que é</Label>
                      <Input
                        value={draft.title}
                        onChange={e => setDrafts(d => ({ ...d, [row.id]: { ...draft, title: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input
                        value={draft.sku}
                        onChange={e => setDrafts(d => ({ ...d, [row.id]: { ...draft, sku: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={resolve.isPending || !draft.title.trim()}
                    onClick={() => resolve.mutate({ row, title: draft.title.trim(), sku: draft.sku.trim() })}
                  >
                    <Check className="mr-2 h-4 w-4" /> Confirmar identificação
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

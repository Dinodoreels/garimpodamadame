import { useState } from 'react';
import { CheckCircle2, Loader2, PackageCheck, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminOrder } from '@/hooks/useAdminData';

const labels: Record<string, string> = {
  awaiting_separation: 'Aguardando separação',
  separating: 'Em separação',
  packed: 'Conferido e embalado',
  posted: 'Postado',
  returned: 'Devolvido',
};

interface FulfillmentActionsProps {
  order: AdminOrder;
  onChanged?: () => void;
}

export function FulfillmentActions({ order, onChanged }: FulfillmentActionsProps) {
  const [working, setWorking] = useState(false);
  const isTerminal = ['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status);
  const step = isTerminal && ['shipped', 'delivered'].includes(order.status)
    ? 'posted'
    : order.fulfillment_status ?? 'awaiting_separation';

  const advance = async (action: 'start_separation' | 'confirm_packed') => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke('order-fulfillment', {
        body: { order_id: order.id, action },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Não foi possível avançar a expedição.');
      toast.success(action === 'start_separation' ? 'Separação iniciada.' : 'Pedido conferido e embalado.');
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível avançar a expedição.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="space-y-3 border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Separação e conferência</p>
          <p className="text-xs text-muted-foreground">{labels[step] ?? step}</p>
        </div>
        {step === 'posted' && <CheckCircle2 className="h-5 w-5 text-primary" />}
      </div>
      {step === 'awaiting_separation' && (
        <Button className="w-full" onClick={() => void advance('start_separation')} disabled={working}>
          {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
          Iniciar separação
        </Button>
      )}
      {step === 'separating' && (
        <Button className="w-full" onClick={() => void advance('confirm_packed')} disabled={working}>
          {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
          Confirmar itens e embalagem
        </Button>
      )}
      {step === 'packed' && <p className="text-xs text-muted-foreground">Informe o rastreio abaixo para confirmar a postagem.</p>}
      {step === 'posted' && <p className="text-xs text-muted-foreground">Postagem registrada. O pedido não pode voltar etapas.</p>}
      {['cancelled', 'refunded'].includes(order.status) && <p className="text-xs text-muted-foreground">Este pedido está encerrado e não pode entrar na expedição.</p>}
    </section>
  );
}

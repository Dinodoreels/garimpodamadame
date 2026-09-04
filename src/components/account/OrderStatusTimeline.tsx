import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Clock, Truck, Package, MapPin, ExternalLink, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OrderTimelineProps {
  order: {
    status: string;
    created_at: string;
    paid_at?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    tracking_code?: string | null;
    tracking_url?: string | null;
  };
}

const steps = [
  { key: 'created', label: 'Pedido Criado', icon: Package, color: 'bg-muted-foreground' },
  { key: 'paid', label: 'Pagamento Confirmado', icon: CreditCard, color: 'bg-emerald-500' },
  { key: 'shipped', label: 'Enviado', icon: Truck, color: 'bg-violet-500' },
  { key: 'delivered', label: 'Entregue', icon: MapPin, color: 'bg-blue-500' },
];

const getStepStatus = (order: OrderTimelineProps['order'], stepKey: string) => {
  switch (stepKey) {
    case 'created':
      return { completed: true, date: order.created_at };
    case 'paid':
      return { 
        completed: order.paid_at != null || ['paid', 'shipped', 'delivered'].includes(order.status),
        date: order.paid_at 
      };
    case 'shipped':
      return { 
        completed: order.shipped_at != null || ['shipped', 'delivered'].includes(order.status),
        date: order.shipped_at 
      };
    case 'delivered':
      return { 
        completed: order.delivered_at != null || order.status === 'delivered',
        date: order.delivered_at 
      };
    default:
      return { completed: false, date: null };
  }
};

export function OrderStatusTimeline({ order }: OrderTimelineProps) {
  if (order.status === 'cancelled') {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
        <p className="text-destructive font-medium">Pedido Cancelado</p>
      </div>
    );
  }

  if (order.status === 'payment_failed') {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-yellow-700 font-medium">Aguardando pagamento</p>
        <p className="text-sm text-yellow-600 mt-1">
          O pagamento não foi confirmado. Tente novamente ou entre em contato.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const { completed, date } = getStepStatus(order, step.key);
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.key} className="flex gap-3">
            {/* Vertical line + icon column */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors",
                  completed 
                    ? `${step.color} text-white` 
                    : "bg-muted text-muted-foreground"
                )}
              >
                {completed ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              {!isLast && (
                <div 
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px] my-1 rounded-full transition-colors",
                    completed ? "bg-primary/30" : "bg-muted"
                  )}
                />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-4 last:pb-0 pt-1.5">
              <p className={cn(
                "font-medium text-sm leading-tight",
                completed ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </p>
              {date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
              
              {/* Tracking info */}
              {step.key === 'shipped' && order.tracking_code && (
                <div className="mt-2 p-2.5 bg-muted/50 rounded-lg text-xs border border-border/50">
                  <p className="text-muted-foreground">
                    Código: <span className="font-mono font-semibold text-foreground">{order.tracking_code}</span>
                  </p>
                  {order.tracking_url && (
                    <Button
                      variant="link"
                      size="sm"
                      asChild
                      className="h-auto p-0 mt-1.5 text-xs"
                    >
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                        Rastrear encomenda
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

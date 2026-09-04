import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  CreditCard, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  status: string;
  timestamp: string | null;
  note?: string;
  changed_by_name?: string;
}

interface OrderTimelineProps {
  status: string;
  createdAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  history?: Array<{ status: string; created_at: string; note?: string; changed_by_name?: string }>;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'Pedido Criado', icon: Clock, color: 'text-yellow-500' },
  paid: { label: 'Pagamento Confirmado', icon: CreditCard, color: 'text-blue-500' },
  processing: { label: 'Em Preparação', icon: Package, color: 'text-purple-500' },
  shipped: { label: 'Enviado', icon: Truck, color: 'text-indigo-500' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'text-green-500' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-500' },
};

export function OrderTimeline({
  status,
  createdAt,
  paidAt,
  shippedAt,
  deliveredAt,
  history = [],
}: OrderTimelineProps) {
  // Build timeline from history or inferred dates
  const events: TimelineEvent[] = [];

  // Build timeline from history if available, otherwise from inferred dates
  if (history.length > 0) {
    // Always add creation event
    events.push({ status: 'pending', timestamp: createdAt });
    
    // Add history events (skip 'pending' duplicates)
    history.forEach(h => {
      if (h.status !== 'pending') {
        events.push({ 
          status: h.status, 
          timestamp: h.created_at, 
          note: h.note,
          changed_by_name: h.changed_by_name,
        });
      }
    });
  } else {
    // Fallback: infer from date fields
    events.push({ status: 'pending', timestamp: createdAt });
    if (paidAt) events.push({ status: 'paid', timestamp: paidAt });
    if (shippedAt) events.push({ status: 'shipped', timestamp: shippedAt });
    if (deliveredAt) events.push({ status: 'delivered', timestamp: deliveredAt });
    if (status === 'cancelled') {
      events.push({ status: 'cancelled', timestamp: new Date().toISOString() });
    }
  }

  // Sort by timestamp
  events.sort((a, b) => 
    new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );

  return (
    <div className="relative">
      {events.map((event, index) => {
        const config = statusConfig[event.status] || statusConfig.pending;
        const Icon = config.icon;
        const isLast = index === events.length - 1;
        const isCurrent = event.status === status;

        return (
          <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <div 
                className="absolute left-4 top-8 w-0.5 h-full -translate-x-1/2 bg-border"
              />
            )}
            
            {/* Icon */}
            <div 
              className={cn(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center",
                isCurrent ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Icon className={cn("h-4 w-4", !isCurrent && config.color)} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium",
                isCurrent && "text-foreground",
                !isCurrent && "text-muted-foreground"
              )}>
                {config.label}
              </p>
              {event.timestamp && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {event.changed_by_name && (
                    <span className="ml-1">por <span className="font-medium">{event.changed_by_name}</span></span>
                  )}
                </p>
              )}
              {event.note && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  {event.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

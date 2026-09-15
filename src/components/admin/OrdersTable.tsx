import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, ImageOff, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdminOrder } from '@/hooks/useAdminData';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { resolveOrderSource } from '@/lib/orderSource';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  paid: { label: 'Pago', className: 'bg-green-100 text-green-800 border-green-200' },
  processing: { label: 'Processando', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  shipped: { label: 'Enviado', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  delivered: { label: 'Entregue', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-200' },
  payment_failed: { label: 'Pagamento Falhou', className: 'bg-red-100 text-red-800 border-red-200' },
};

interface OrdersTableProps {
  orders: AdminOrder[];
  onStatusChange: (orderId: string, status: string) => Promise<void>;
}

export function OrdersTable({ orders, onStatusChange }: OrdersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await onStatusChange(orderId, status);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <div className="border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Pedido</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden sm:table-cell">Cliente e produtos</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden md:table-cell">Data</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden lg:table-cell">Origem</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Status</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right whitespace-nowrap">Total</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-light">
                  Nenhum pedido encontrado
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const source = resolveOrderSource(order);
                const SourceIcon = source.icon;
                return (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium whitespace-nowrap">{order.order_number}</TableCell>
                     <TableCell className="hidden min-w-[320px] sm:table-cell">
                       <p className="font-light">{order.profile?.full_name || (order as any).guest_info?.name || 'N/A'}</p>
                       <div className="mt-2 space-y-2">
                         {(order.order_items ?? []).map((item: any) => (
                           <div key={item.id} className="flex items-center gap-2 text-xs">
                             {item.image_url ? <img src={item.image_url} alt={item.product_title} className="h-9 w-9 shrink-0 rounded-sm border object-cover" loading="lazy" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground" /></span>}
                             <div className="min-w-0">
                               <p className="font-medium leading-tight">{item.product_title}</p>
                               <p className="text-muted-foreground">{item.variant_title ? `${item.variant_title} · ` : ''}{item.sku ? `SKU ${item.sku} · ` : ''}{item.quantity} × {formatCurrency(Number(item.unit_price))}</p>
                             </div>
                           </div>
                         ))}
                       </div>
                    </TableCell>
                    <TableCell className="font-light text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {format(new Date(order.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className={cn("font-light text-xs whitespace-nowrap w-fit", source.className)}>
                          <SourceIcon className="h-3 w-3 mr-1" />
                          {source.platform}
                        </Badge>
                        {source.storeName && (
                          <span className="text-[10px] text-muted-foreground font-light">{source.storeName}</span>
                        )}
                        {order.created_by_name && (
                          <span className="text-[10px] text-muted-foreground font-light">
                            por {order.created_by_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("font-light text-xs whitespace-nowrap", status.className)}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            disabled={updatingId === order.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'paid')}>
                            Marcar como Pago
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'processing')}>
                            Marcar como Processando
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'shipped')}>
                            Marcar como Enviado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'delivered')}>
                            Marcar como Entregue
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            className="text-red-600"
                          >
                            Cancelar Pedido
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <OrderDetailsDialog 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)}
        onStatusChange={onStatusChange}
      />
    </>
  );
}

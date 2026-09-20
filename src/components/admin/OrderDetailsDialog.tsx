import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Truck, User, Package, FileText, Printer, CreditCard, QrCode, Receipt, Send, Gift, Tag, Store, RotateCcw, ClipboardList } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AdminOrder } from '@/hooks/useAdminData';
import { TrackingForm } from './TrackingForm';
import { OrderTimeline } from './OrderTimeline';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIntegrations } from '@/hooks/useIntegrations';
import { generateReceiptHTML } from '@/lib/generateReceipt';
import { useRefundsByOrder, useCreateRefund, useUpdateRefundStatus } from '@/hooks/useRefunds';
import { Input } from '@/components/ui/input';
import { LinkedLabelsSection } from './LinkedLabelsSection';
import { FiscalOrderSection } from './FiscalOrderSection';
import { resolveOrderSource } from '@/lib/orderSource';
import { MelhorEnvioSection } from './MelhorEnvioSection';
import { MarketplaceLabelSection } from './MarketplaceLabelSection';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  paid: { label: 'Pago', className: 'bg-green-100 text-green-800 border-green-200' },
  payment_failed: { label: 'Pagamento Falhou', className: 'bg-red-100 text-red-800 border-red-200' },
  processing: { label: 'Processando', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  shipped: { label: 'Enviado', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  delivered: { label: 'Entregue', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-200' },
  refunded: { label: 'Reembolsado', className: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  pix: QrCode,
  credit_card: CreditCard,
  debit_card: CreditCard,
  boleto: Receipt,
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  boleto: 'Boleto Bancário',
};

interface OrderDetailsDialogProps {
  order: AdminOrder | null;
  onClose: () => void;
  onStatusChange?: (orderId: string, status: string) => void;
}

export function OrderDetailsDialog({ order, onClose, onStatusChange }: OrderDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [adminNotes, setAdminNotes] = useState((order as any)?.admin_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [statusHistory, setStatusHistory] = useState<Array<{ status: string; created_at: string; note?: string; changed_by_name?: string }>>([]);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [showRefundForm, setShowRefundForm] = useState(false);
  const { data: integrationsConfig } = useIntegrations();
  const { data: refunds } = useRefundsByOrder(order?.id || null);
  const createRefund = useCreateRefund();
  const updateRefundStatus = useUpdateRefundStatus();

  // Fetch status history with profile names
  useEffect(() => {
    if (!order) return;
    (async () => {
      const { data } = await supabase
        .from('order_status_history')
        .select('status, created_at, note, changed_by')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });
      
      if (!data || data.length === 0) { setStatusHistory([]); return; }
      
      const changerIds = [...new Set(data.map(h => h.changed_by).filter(Boolean) as string[])];
      let nameMap: Record<string, string> = {};
      if (changerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', changerIds);
        if (profiles) {
          nameMap = profiles.reduce((acc: Record<string, string>, p) => {
            acc[p.id] = p.full_name || 'Admin';
            return acc;
          }, {});
        }
      }
      
      setStatusHistory(data.map(h => ({
        status: h.status,
        created_at: h.created_at || new Date().toISOString(),
        note: h.note || undefined,
        changed_by_name: h.changed_by ? nameMap[h.changed_by] || 'Admin' : undefined,
      })));
    })();
  }, [order?.id]);

  if (!order) return null;

  const status = statusConfig[order.status] || statusConfig.pending;
  const address = order.shipping_address;
  const guestInfo = (order as any).guest_info;
  const paymentMethod = (order as any).payment_method;
  const paymentReceiptUrl = (order as any).payment_receipt_url;
  const loyaltyPointsUsed = (order as any).loyalty_points_used || 0;
  const discountCode = (order as any).discount_code;
  const discountAmount = (order as any).discount_amount || 0;
  const sourceDetails = resolveOrderSource(order);
  const SourceIcon = sourceDetails.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ admin_notes: adminNotes })
        .eq('id', order.id);

      if (error) throw error;
      toast.success('Notas salvas com sucesso');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao salvar notas');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      try {
        await onStatusChange(order.id, newStatus);
        toast.success(`Status alterado para ${statusConfig[newStatus]?.label || newStatus}`);
      } catch {
        toast.error('Erro ao alterar status');
      }
    }
  };

  const handleNotifyClient = async () => {
    setNotifying(true);
    try {
      await supabase.functions.invoke('send-notification', {
        body: { type: 'order_shipped', orderId: order.id },
      });
      toast.success('Notificação enviada ao cliente');
    } catch {
      toast.error('Erro ao enviar notificação');
    } finally {
      setNotifying(false);
    }
  };

  const handlePrint = () => {
    const items = order.order_items || [];
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html><head><title>Pedido ${order.order_number}</title>
<style>
  body { font-family: sans-serif; padding: 40px; color: #333; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 20px; font-weight: 400; margin-bottom: 4px; }
  .meta { color: #888; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #eee; font-size: 13px; }
  th { color: #888; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
  .totals { margin-top: 16px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .total { font-weight: 600; font-size: 16px; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; }
  .section { margin-top: 24px; }
  .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
  .address { font-size: 13px; line-height: 1.6; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>Pedido ${order.order_number}</h1>
<p class="meta">${format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Status: ${status.label}</p>
${order.profile?.full_name ? `<p style="font-size:13px"><strong>Cliente:</strong> ${order.profile.full_name}</p>` : ''}
<table><thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead><tbody>
${items.map((i: any) => `<tr><td>${i.product_title}${i.variant_title ? ` - ${i.variant_title}` : ''}</td><td>${i.quantity}</td><td>R$ ${Number(i.unit_price).toFixed(2).replace('.', ',')}</td><td>R$ ${Number(i.total_price).toFixed(2).replace('.', ',')}</td></tr>`).join('')}
</tbody></table>
<div class="totals">
<div><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
${discountAmount > 0 ? `<div style="color:green"><span>Desconto${discountCode ? ` (${discountCode})` : ''}</span><span>-${formatCurrency(discountAmount)}</span></div>` : ''}
<div><span>Frete</span><span>${formatCurrency(order.shipping_cost)}</span></div>
<div class="total"><span>Total</span><span>${formatCurrency(order.total)}</span></div>
</div>
${address ? `<div class="section"><h3>Endereço de Entrega</h3><div class="address">${address.recipient_name}<br>${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}<br>${address.neighborhood}<br>${address.city} - ${address.state}<br>CEP: ${address.zip_code}</div></div>` : ''}
<script>window.print();</script>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSendReceipt = async () => {
    setSendingReceipt(true);

    // Open print window with receipt
    const items = order.order_items || [];
    const storeName = integrationsConfig?.store_name || 'Loja';
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const html = generateReceiptHTML(
        { ...order, payment_method: (order as any).payment_method, discount_code: (order as any).discount_code, discount_amount: (order as any).discount_amount },
        items,
        order.profile,
        storeName
      );
      printWindow.document.write(html);
      printWindow.document.close();
    }

    try {
      const { data } = await supabase.functions.invoke('send-receipt', {
        body: { orderId: order.id },
      });
      if (data?.ok) {
        toast.success('Comprovante fiscal enviado', {
          description: data.results?.join(', ') || 'Enviado com sucesso',
        });
      } else {
        toast.error('Erro ao enviar comprovante');
      }
    } catch {
      toast.error('Erro ao enviar comprovante');
    } finally {
      setSendingReceipt(false);
    }
  };

  const PaymentIcon = paymentMethod ? PAYMENT_ICONS[paymentMethod] || CreditCard : CreditCard;

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-light tracking-wide">
              Pedido {order.order_number}
            </DialogTitle>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" onClick={handleSendReceipt} disabled={sendingReceipt} title="Imprimir e enviar recibo do pedido">
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePrint} title="Imprimir pedido">
                <Printer className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className={cn("font-light", status.className)}>
                {status.label}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-light">
            {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            {(order as any).source === 'whatsapp' && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </span>
            )}
          </p>
        </DialogHeader>

        {/* Quick Status Actions */}
        {onStatusChange && (
          <div className="flex flex-wrap gap-2 pt-2">
            {order.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange('paid')}>
                Marcar como Pago
              </Button>
            )}
            {['pending', 'paid'].includes(order.status) && (
              <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange('processing')}>
                Processando
              </Button>
            )}
            {['paid', 'processing'].includes(order.status) && (
              <Button size="sm" variant="outline" onClick={() => setActiveTab('tracking')}>
                <Truck className="h-4 w-4 mr-1" />
                Marcar Enviado
              </Button>
            )}
            {order.status === 'shipped' && (
              <Button size="sm" variant="outline" onClick={() => handleQuickStatusChange('delivered')}>
                Marcar Entregue
              </Button>
            )}
            {!['cancelled', 'delivered'].includes(order.status) && (
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleQuickStatusChange('cancelled')}>
                Cancelar
              </Button>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Detalhes</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Rastreio</span>
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Cliente</span>
            </TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reembolso</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Fiscal</span>
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Order Items */}
            <div>
              <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 font-light">
                Itens do Pedido
              </h3>
              <div className="space-y-4">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex gap-4">
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.product_title}
                        className="w-16 h-16 object-cover bg-muted"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-light">{item.product_title}</p>
                      {item.variant_title && (
                        <p className="text-sm text-muted-foreground font-light">{item.variant_title}</p>
                      )}
                      <p className="text-sm text-muted-foreground font-light">
                        Qtd: {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(item.total_price)}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Order Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-light">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm font-light text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Desconto {discountCode && `(${discountCode})`}
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {loyaltyPointsUsed > 0 && (
                <div className="flex justify-between text-sm font-light text-amber-600">
                  <span className="flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    Pontos de fidelidade ({loyaltyPointsUsed} pts)
                  </span>
                  <span>-{formatCurrency(loyaltyPointsUsed / 10)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-light">
                <span className="text-muted-foreground">Frete</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-light">Total</span>
                <span className="font-medium">{formatCurrency(order.total)}</span>
              </div>
            </div>

            <Separator />

            {/* Sale Origin Info */}
            <div>
              <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 font-light">
                Informações da Venda
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn('p-2 rounded-lg border', sourceDetails.className)}>
                    <SourceIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Plataforma</p>
                    <p className="text-sm font-light">{sourceDetails.platform}</p>
                  </div>
                </div>
                {sourceDetails.storeName && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-muted"><Store className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Loja / e-commerce</p>
                      <p className="text-sm font-light">{sourceDetails.storeName}</p>
                    </div>
                  </div>
                )}
                {sourceDetails.externalOrderNumber && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-muted"><ClipboardList className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pedido na plataforma</p>
                      <p className="text-sm font-light">{sourceDetails.externalOrderNumber}</p>
                    </div>
                  </div>
                )}
                {order.created_by_name && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-muted"><Store className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Criado por</p>
                      <p className="text-sm font-light">{order.created_by_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Payment Info */}
            <div>
              <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 font-light">
                Pagamento
              </h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <PaymentIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-light">
                    {paymentMethod ? PAYMENT_LABELS[paymentMethod] || paymentMethod : 'Não informado'}
                  </p>
                  {(order as any).payment_attempts > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {(order as any).payment_attempts} tentativas
                    </p>
                  )}
                </div>
                <Badge variant="outline">{order.paid_at ? 'Cobrança confirmada' : order.status === 'payment_failed' ? 'Cobrança com falha' : 'Aguardando pagamento'}</Badge>
              </div>

              {order.paid_at && <p className="mt-3 text-xs text-muted-foreground">Confirmado em {format(new Date(order.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
              {order.payment_status_detail && <p className="mt-2 text-xs text-muted-foreground">Retorno do pagamento: {order.payment_status_detail}</p>}
              {order.last_payment_error && <p className="mt-2 text-xs text-destructive">Falha registrada: {order.last_payment_error}</p>}

              {paymentReceiptUrl && (
                <div className="mt-3">
                  <a
                    href={paymentReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline inline-flex items-center gap-1"
                  >
                    <Receipt className="h-3 w-3" />
                    Ver comprovante de pagamento
                  </a>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6 mt-4">
            <MarketplaceLabelSection
              orderId={order.id}
              orderNumber={order.order_number}
              source={order.source}
              label={order.marketplace_shipping_label}
            />

            <MelhorEnvioSection
              orderId={order.id}
              source={order.source}
              service={order.shipping_service}
              carrier={order.shipping_carrier}
              estimate={order.shipping_estimated_days}
            />

            <Separator />
            <TrackingForm 
              orderId={order.id} 
              currentTrackingCode={(order as any).tracking_code}
              currentTrackingUrl={(order as any).tracking_url}
              currentNotes={(order as any).admin_notes}
              onSave={async (data) => {
                const { error } = await supabase
                  .from('orders')
                  .update({
                    tracking_code: data.tracking_code,
                    tracking_url: data.tracking_url,
                    admin_notes: data.admin_notes,
                    status: data.status || order.status,
                    shipped_at: data.status === 'shipped' ? new Date().toISOString() : undefined,
                  })
                  .eq('id', order.id);
                if (error) throw error;
                if (onStatusChange && data.status) {
                  onStatusChange(order.id, data.status);
                }
              }}
            />

            {/* Notify client button */}
            {(order as any).tracking_code && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNotifyClient}
                disabled={notifying}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {notifying ? 'Enviando...' : 'Notificar cliente sobre envio'}
              </Button>
            )}
            
            <Separator />

            <LinkedLabelsSection 
              orderId={order.id} 
              totalOrderItems={order.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0}
              onStatusChange={onStatusChange}
            />
            
            <Separator />
            <div>
              <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 font-light">
                Histórico do Pedido
              </h3>
              <OrderTimeline 
                status={order.status}
                createdAt={order.created_at}
                paidAt={(order as any).paid_at}
                shippedAt={(order as any).shipped_at}
                deliveredAt={(order as any).delivered_at}
                history={statusHistory}
              />
            </div>
          </TabsContent>

          {/* Customer Tab */}
          <TabsContent value="customer" className="space-y-6 mt-4">
            <div>
              <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 font-light">
                Cliente
              </h3>
              {guestInfo ? (
                <div className="space-y-1 font-light">
                  <p className="font-medium">{guestInfo.name}</p>
                  <p className="text-sm text-muted-foreground">{guestInfo.phone}</p>
                  {guestInfo.email && (
                    <p className="text-sm text-muted-foreground">{guestInfo.email}</p>
                  )}
                  <Badge variant="outline" className="mt-2">Cliente WhatsApp</Badge>
                </div>
              ) : (
                <div className="font-light">
                  <p>{order.profile?.full_name || 'N/A'}</p>
                  {order.profile?.phone && (
                    <p className="text-sm text-muted-foreground">{order.profile.phone}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {address && (
              <div>
                <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 font-light">
                  Endereço de Entrega
                </h3>
                <div className="text-sm font-light space-y-1">
                  <p>{address.recipient_name}</p>
                  <p>{address.street}, {address.number}</p>
                  {address.complement && <p>{address.complement}</p>}
                  <p>{address.neighborhood}</p>
                  <p>{address.city} - {address.state}</p>
                  <p>CEP: {address.zip_code}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Notas Internas (visíveis apenas para admins)</Label>
              <Textarea
                placeholder="Adicione observações sobre o pedido..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={5}
              />
            </div>
            <Button 
              onClick={handleSaveNotes} 
              disabled={savingNotes}
              className="w-full"
            >
              {savingNotes ? 'Salvando...' : 'Salvar Notas'}
            </Button>
          </TabsContent>

          <TabsContent value="fiscal" className="space-y-4 mt-4">
            <FiscalOrderSection orderId={order.id} orderStatus={order.status} orderSource={order.source ?? 'website'} />
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-4 mt-4">
            {['paid', 'delivered', 'shipped'].includes(order.status) && !showRefundForm && (
              <Button onClick={() => { setShowRefundForm(true); setRefundAmount(String(order.total)); }} variant="outline" className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Solicitar Reembolso
              </Button>
            )}

            {showRefundForm && (
              <div className="space-y-3 p-4 border rounded-lg">
                <h3 className="text-sm font-medium">Novo Reembolso</h3>
                <div className="space-y-2">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Motivo</Label>
                  <Textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Descreva o motivo do reembolso..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await createRefund.mutateAsync({
                        orderId: order.id,
                        amount: parseFloat(refundAmount) || 0,
                        reason: refundReason,
                      });
                      setShowRefundForm(false);
                      setRefundAmount('');
                      setRefundReason('');
                    }}
                    disabled={createRefund.isPending || !refundReason.trim()}
                  >
                    Confirmar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowRefundForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {refunds && refunds.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-light">
                  Histórico de Reembolsos
                </h3>
                {refunds.map((r) => (
                  <div key={r.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{formatCurrency(r.amount)}</span>
                      <Badge variant="outline" className={cn(
                        r.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                        r.status === 'approved' && 'bg-green-100 text-green-800',
                        r.status === 'rejected' && 'bg-red-100 text-red-800',
                        r.status === 'completed' && 'bg-blue-100 text-blue-800',
                      )}>
                        {r.status === 'pending' ? 'Pendente' : r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Rejeitado' : 'Concluído'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 h-7 text-xs"
                          onClick={() => updateRefundStatus.mutate({ refundId: r.id, status: 'approved', orderId: order.id })}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive h-7 text-xs"
                          onClick={() => updateRefundStatus.mutate({ refundId: r.id, status: 'rejected', orderId: order.id })}
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !showRefundForm && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum reembolso registrado</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

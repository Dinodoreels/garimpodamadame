import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, Heart, Settings, LogOut, Loader2, Eye, Edit2, Lock, MapPin, Bell, ChevronRight, Trash2, Star, ChevronDown, RefreshCw, ExternalLink, Ticket, FileText, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { OrderStatusTimeline } from '@/components/account/OrderStatusTimeline';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useOrders } from '@/hooks/useOrders';
import { useFavorites } from '@/hooks/useFavorites';
import { AddressList } from '@/components/account/AddressList';
import { ChangePasswordDialog } from '@/components/account/ChangePasswordDialog';
import { LoyaltyCard } from '@/components/account/LoyaltyCard';
import { CustomerCouponsCard } from '@/components/account/CustomerCouponsCard';
import { SimulateShippingTab } from '@/components/account/SimulateShippingTab';
import { useLoyaltySettings } from '@/hooks/useLoyalty';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateReceiptHTML } from '@/lib/generateReceipt';
import { supabase } from '@/integrations/supabase/client';
import { useIntegrations } from '@/hooks/useIntegrations';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  payment_failed: 'bg-red-100 text-red-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  payment_failed: 'Pagamento Falhou',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};

export default function Account() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { orders, loading: ordersLoading } = useOrders();
  const { favorites, loading: favoritesLoading, removeFavorite } = useFavorites();
  const { data: loyaltySettings } = useLoyaltySettings();
  const { data: integrationsConfig } = useIntegrations();
  
  const [isEditing, setIsEditing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    cpf: '',
    birth_date: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        birth_date: profile.birth_date || ''
      });
    }
  }, [profile]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair', { description: error.message });
      return;
    }
    toast.success('Você saiu da sua conta');
    navigate('/');
  };

  const nameIsLocked = !!profile?.full_name;
  const cpfIsLocked = !!profile?.cpf;
  const birthIsLocked = !!profile?.birth_date;

  const handleSaveProfile = async () => {
    const updates = { ...formData };
    if (nameIsLocked) delete (updates as any).full_name;
    if (cpfIsLocked) delete (updates as any).cpf;
    if (birthIsLocked) delete (updates as any).birth_date;

    const { error } = await updateProfile(updates);
    if (error) {
      toast.error('Erro ao salvar', { description: error.message });
      return;
    }
    toast.success('Perfil atualizado com sucesso');
    setIsEditing(false);
  };

  const handleRemoveFavorite = async (productId: string) => {
    const { error } = await removeFavorite(productId);
    if (error) {
      toast.error('Erro ao remover favorito');
    } else {
      toast.success('Removido dos favoritos');
    }
  };

  const handleBuyAgain = (order: any) => {
    toast.info('Navegando para os produtos do pedido');
    navigate('/catalog');
  };

  const handleReceipt = async (order: any) => {
    // Open print window
    const items = order.order_items || [];
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const storeName = integrationsConfig?.store_name || 'Loja';
      const html = generateReceiptHTML(
        { ...order, payment_method: (order as any).payment_method, discount_code: (order as any).discount_code, discount_amount: (order as any).discount_amount },
        items,
        profile,
        storeName
      );
      printWindow.document.write(html);
      printWindow.document.close();
    }

    // Send via WhatsApp + Email
    try {
      const { data } = await supabase.functions.invoke('send-receipt', {
        body: { orderId: order.id },
      });
      if (data?.ok && data.results?.length > 0) {
        toast.success('Comprovante enviado', { description: data.results.join(', ') });
      }
    } catch {
      // Silent fail - print window already opened
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const formatPrice = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(amount);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container py-8 max-w-4xl">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-muted">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Minha Conta</h1>
              <p className="text-muted-foreground text-sm">Gerencie suas informações e pedidos</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full mb-8 h-auto p-1 bg-muted/50 grid-cols-3 sm:grid-cols-6">
              <TabsTrigger value="profile" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </TabsTrigger>
              <TabsTrigger value="benefits" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline">Benefícios</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Pedidos</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Favoritos</span>
              </TabsTrigger>
              <TabsTrigger value="shipping" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Frete</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configurações</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>Gerencie suas informações de perfil</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!isEditing ? (
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    ) : (
                      <Button onClick={handleSaveProfile} className="bg-primary text-primary-foreground">
                        Salvar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm flex items-center gap-1">
                        Nome completo
                        {nameIsLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      {isEditing && !nameIsLocked ? (
                        <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="bg-muted/50" />
                      ) : (
                        <p className="font-medium py-2">{formData.full_name || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">E-mail</Label>
                      <p className="font-medium py-2">{user.email}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Telefone</Label>
                      {isEditing ? (
                        <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" className="bg-muted/50" />
                      ) : (
                        <p className="font-medium py-2">{formData.phone || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm flex items-center gap-1">
                        CPF
                        {cpfIsLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      {isEditing && !cpfIsLocked ? (
                        <Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })} placeholder="123.456.789-00" className="bg-muted/50" />
                      ) : (
                        <p className="font-medium py-2">{formData.cpf || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm flex items-center gap-1">
                        Data de nascimento
                        {birthIsLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      {isEditing && !birthIsLocked ? (
                        <Input type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} className="bg-muted/50" />
                      ) : (
                        <p className="font-medium py-2">
                          {formData.birth_date ? new Date(formData.birth_date).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Membro desde</Label>
                      <p className="font-medium py-2">{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Benefits Tab */}
            <TabsContent value="benefits">
              <div className="space-y-6">
                <CustomerCouponsCard />
                {orders.length > 0 && loyaltySettings?.isActive && <LoyaltyCard />}
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Pedidos</CardTitle>
                  <CardDescription>Acompanhe o status dos seus pedidos</CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order) => {
                        const itemCount = order.order_items?.length || 0;
                        return (
                        <Collapsible
                          key={order.id}
                          open={expandedOrderId === order.id}
                          onOpenChange={(open) => setExpandedOrderId(open ? order.id : null)}
                        >
                          <div className="border rounded-xl overflow-hidden bg-card">
                            <CollapsibleTrigger asChild>
                              <button className="w-full p-5 text-left hover:bg-muted/30 transition-colors">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-base">#{order.order_number}</span>
                                    <span className="text-muted-foreground text-sm">
                                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className={STATUS_STYLES[order.status] || STATUS_STYLES.pending}>
                                      {STATUS_LABELS[order.status] || order.status}
                                    </Badge>
                                    <span className="font-bold text-base">{formatPrice(order.total)}</span>
                                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', expandedOrderId === order.id && 'rotate-180')} />
                                  </div>
                                </div>

                                {/* Items preview */}
                                <div className="mt-3 flex items-center gap-2.5 overflow-hidden">
                                  {order.order_items?.slice(0, 4).map((item) => (
                                    <img
                                      key={item.id}
                                      src={item.image_url || '/placeholder.svg'}
                                      alt={item.product_title}
                                      className="w-12 h-12 object-cover rounded-lg bg-muted border border-border/50"
                                    />
                                  ))}
                                  {itemCount > 4 && (
                                    <div className="w-12 h-12 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
                                      <span className="text-xs font-medium text-muted-foreground">+{itemCount - 4}</span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="border-t">
                                {/* Timeline */}
                                <div className="p-5 bg-muted/20">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status do Pedido</h4>
                                  <OrderStatusTimeline order={{
                                    status: order.status,
                                    created_at: order.created_at,
                                    paid_at: (order as any).paid_at,
                                    shipped_at: (order as any).shipped_at,
                                    delivered_at: (order as any).delivered_at,
                                    tracking_code: (order as any).tracking_code,
                                    tracking_url: (order as any).tracking_url,
                                  }} />
                                </div>

                                <Separator />

                                {/* Items */}
                                <div className="p-5">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Itens do Pedido</h4>
                                  <div className="space-y-3">
                                    {order.order_items?.map((item) => (
                                      <div key={item.id} className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                                        <img
                                          src={item.image_url || '/placeholder.svg'}
                                          alt={item.product_title}
                                          className="w-16 h-16 object-cover rounded-lg bg-muted border border-border/50"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm truncate">{item.product_title}</p>
                                          {item.variant_title && item.variant_title !== 'Default Title' && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{item.variant_title}</p>
                                          )}
                                          <p className="text-xs text-muted-foreground mt-0.5">Qtd: {item.quantity} × {formatPrice(item.unit_price)}</p>
                                        </div>
                                        <p className="font-semibold text-sm whitespace-nowrap">{formatPrice(item.total_price)}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Order summary */}
                                  <div className="mt-4 pt-3 border-t border-dashed space-y-1.5 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Subtotal</span>
                                      <span>{formatPrice(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Frete</span>
                                      <span>{order.shipping_cost ? formatPrice(order.shipping_cost) : 'Grátis'}</span>
                                    </div>
                                    {(order as any).discount_amount > 0 && (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>Desconto</span>
                                        <span>-{formatPrice((order as any).discount_amount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold text-base pt-1.5 border-t">
                                      <span>Total</span>
                                      <span>{formatPrice(order.total)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Shipping address */}
                                {order.shipping_address && (
                                  <>
                                    <Separator />
                                    <div className="p-5">
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Endereço de Entrega</h4>
                                      <div className="text-sm text-muted-foreground space-y-0.5">
                                        <p>{(order.shipping_address as any).street}, {(order.shipping_address as any).number}</p>
                                        {(order.shipping_address as any).complement && <p>{(order.shipping_address as any).complement}</p>}
                                        <p>{(order.shipping_address as any).neighborhood} - {(order.shipping_address as any).city}/{(order.shipping_address as any).state}</p>
                                        {(order.shipping_address as any).zip_code && <p>CEP: {(order.shipping_address as any).zip_code}</p>}
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Actions */}
                                <div className="p-5 pt-0 flex gap-3">
                                  {['paid', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReceipt(order)}
                                      className="flex-1 h-10"
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Comprovante
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => handleBuyAgain(order)}
                                    className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Comprar novamente
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">Você ainda não fez nenhum pedido</p>
                      <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
                        <Link to="/catalog">Ver Produtos</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos Favoritos</CardTitle>
                  <CardDescription>Seus produtos salvos para comprar depois</CardDescription>
                </CardHeader>
                <CardContent>
                  {favoritesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                  ) : favorites.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {favorites.map((favorite) => (
                        <div key={favorite.id} className="border rounded-lg overflow-hidden group">
                          <Link to={`/product/${favorite.product_handle}`}>
                            <div className="aspect-square bg-muted relative">
                              {favorite.product_image ? (
                                <img 
                                  src={favorite.product_image} 
                                  alt={favorite.product_title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  Sem imagem
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveFavorite(favorite.product_id || favorite.shopify_product_id);
                                }}
                                className="absolute top-2 right-2 p-2 rounded-full bg-background/80 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="p-3">
                              <p className="font-medium text-sm line-clamp-2">{favorite.product_title}</p>
                              {favorite.product_price && (
                                <p className="text-gold font-semibold mt-1">
                                  {formatPrice(favorite.product_price, favorite.currency_code)}
                                </p>
                              )}
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">Você ainda não tem produtos favoritos</p>
                      <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
                        <Link to="/catalog">Explorar produtos</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shipping Simulator Tab */}
            <TabsContent value="shipping">
              <SimulateShippingTab />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações da Conta</CardTitle>
                    <CardDescription>Gerencie suas preferências e configurações</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Notificações por e-mail</p>
                          <p className="text-sm text-muted-foreground">Receber atualizações sobre pedidos e promoções</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configurar
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Alterar senha</p>
                          <p className="text-sm text-muted-foreground">Mantenha sua conta segura</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
                        <Lock className="h-4 w-4 mr-1" />
                        Alterar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <AddressList />
                  </CardContent>
                </Card>

                <Button onClick={handleSignOut} variant="destructive" className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da conta
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
      
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, X, Check, AlertCircle, Truck, MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CustomerSelect } from '@/components/admin/manual-order/CustomerSelect';
import { GuestCustomerForm } from '@/components/admin/manual-order/GuestCustomerForm';
import { ProductSelector } from '@/components/admin/manual-order/ProductSelector';
import { OrderSummary } from '@/components/admin/manual-order/OrderSummary';
import { useManualOrder, ManualOrderItem, GuestInfo, DiscountValidation } from '@/hooks/useManualOrder';
import { Address } from '@/hooks/useAddresses';
import { getAddressFromZip, formatZipCode, calculateShippingOptions, ShippingOption } from '@/lib/shipping';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMyStores, useActiveStores } from '@/hooks/useStores';
import { useUserRole } from '@/hooks/useUserRole';

const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' }, { code: 'AL', name: 'Alagoas' }, { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' }, { code: 'BA', name: 'Bahia' }, { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' }, { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' }, { code: 'MA', name: 'Maranhão' }, { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' }, { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' }, { code: 'PB', name: 'Paraíba' }, { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' }, { code: 'PI', name: 'Piauí' }, { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' }, { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' }, { code: 'RR', name: 'Roraima' }, { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' }, { code: 'SE', name: 'Sergipe' }, { code: 'TO', name: 'Tocantins' },
];

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Comprovante PIX',
  card: 'Comprovante de Pagamento',
  boleto: 'Comprovante de Boleto',
  cash: 'Comprovante de Pagamento',
  other: 'Comprovante de Pagamento',
};

export default function NewOrder() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const {
    loading, searchingCustomers, searchingProducts,
    searchCustomers, searchProducts, createOrder,
    fetchCustomerAddresses, validateDiscount,
  } = useManualOrder();

  // Store hooks
  const { data: myStores } = useMyStores();
  const { data: allActiveStores } = useActiveStores();
  const isAdmin = role === 'admin';
  const availableStores = isAdmin ? (allActiveStores || []) : (myStores || []);

  // Customer state
  const [customerType, setCustomerType] = useState<'registered' | 'guest'>('guest');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', phone: '' });

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Delivery type
  const [deliveryType, setDeliveryType] = useState<'shipping' | 'pickup'>('shipping');
  const [pickupStoreId, setPickupStoreId] = useState<string>('');

  // Address state
  const [address, setAddress] = useState({
    recipient_name: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', zip_code: '',
  });

  // CEP lookup
  const [loadingCEP, setLoadingCEP] = useState(false);

  // Products state
  const [items, setItems] = useState<ManualOrderItem[]>([]);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [initialStatus, setInitialStatus] = useState('pending');
  const [orderSource, setOrderSource] = useState<'whatsapp' | 'store' | 'website'>('whatsapp');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Coupon state
  const [discountCode, setDiscountCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<DiscountValidation | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);

  // Shipping state
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingIdx, setSelectedShippingIdx] = useState(0);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [useCustomShipping, setUseCustomShipping] = useState(false);
  const [customShipping, setCustomShipping] = useState('');

  const [adminNotes, setAdminNotes] = useState('');

  // Sale date (optional — backdate orders for past sales)
  const [saleDate, setSaleDate] = useState('');

  // Receipt upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);

  // ---- Auto-select store for sellers with 1 store ----
  useEffect(() => {
    if (!isAdmin && myStores && myStores.length === 1) {
      setPickupStoreId(myStores[0].id);
    }
  }, [isAdmin, myStores]);

  // ---- CEP auto-fill ----
  const cleanZip = address.zip_code.replace(/\D/g, '');

  useEffect(() => {
    if (cleanZip.length !== 8) return;
    let cancelled = false;

    setLoadingCEP(true);
    getAddressFromZip(cleanZip).then((result) => {
      if (cancelled || !result) { setLoadingCEP(false); return; }
      setAddress(prev => ({
        ...prev,
        street: result.street || prev.street,
        neighborhood: result.neighborhood || prev.neighborhood,
        city: result.city || prev.city,
        state: result.state || prev.state,
      }));
      setLoadingCEP(false);
    });

    return () => { cancelled = true; };
  }, [cleanZip]);

  // ---- Shipping calc ----
  useEffect(() => {
    if (cleanZip.length !== 8 || items.length === 0) {
      setShippingOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingShipping(true);

    const subtotal = items.reduce((s, i) => s + i.variant.price * i.quantity, 0);
    calculateShippingOptions(cleanZip, {
      subtotal,
      items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
    }).then((result) => {
      if (cancelled) return;
      setShippingOptions(result?.options || []);
      setSelectedShippingIdx(0);
      setLoadingShipping(false);
    });

    return () => { cancelled = true; };
  }, [cleanZip, items]);

  // ---- Customer addresses ----
  useEffect(() => {
    if (customerType !== 'registered' || !selectedCustomer?.id) {
      setSavedAddresses([]);
      setSelectedAddressId('');
      return;
    }
    setLoadingAddresses(true);
    fetchCustomerAddresses(selectedCustomer.id).then((addrs) => {
      setSavedAddresses(addrs);
      setLoadingAddresses(false);
      // Auto-select default address
      const defaultAddr = addrs.find(a => a.is_default);
      if (defaultAddr) {
        selectSavedAddress(defaultAddr);
      }
    });
  }, [selectedCustomer, customerType, fetchCustomerAddresses]);

  const selectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setAddress({
      recipient_name: addr.recipient_name,
      street: addr.street,
      number: addr.number,
      complement: addr.complement || '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      zip_code: formatZipCode(addr.zip_code),
    });
  };

  // ---- Coupon validation ----
  const subtotal = items.reduce((s, i) => s + i.variant.price * i.quantity, 0);

  const handleValidateCoupon = useCallback(async () => {
    if (!discountCode.trim()) {
      setCouponValidation(null);
      return;
    }
    setValidatingCoupon(true);
    const result = await validateDiscount(discountCode, subtotal);
    setCouponValidation(result);
    setValidatingCoupon(false);
  }, [discountCode, subtotal, validateDiscount]);

  const discountAmount = couponValidation?.valid
    ? (couponValidation.calculatedDiscount || 0)
    : manualDiscount;

  // Shipping cost
  const shippingCost = deliveryType === 'pickup'
    ? 0
    : useCustomShipping
      ? (parseFloat(customShipping) || 0)
      : (shippingOptions[selectedShippingIdx]?.cost || 0);

  // ---- Receipt handlers ----
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5MB)'); return; }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null;
    setUploadingReceipt(true);
    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('payment-receipts').upload(filePath, receiptFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('payment-receipts').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Erro ao fazer upload do comprovante');
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  // ---- Submit ----
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Adicione pelo menos um produto'); return; }
    if (customerType === 'guest' && (!guestInfo.name || !guestInfo.phone)) { toast.error('Preencha nome e telefone'); return; }
    if (customerType === 'registered' && !selectedCustomer) { toast.error('Selecione um cliente'); return; }
    if (deliveryType === 'pickup') {
      if (!pickupStoreId) { toast.error('Selecione a loja para retirada'); return; }
    } else {
      if (!address.street || !address.number || !address.city || !address.state || !address.zip_code) { toast.error('Preencha o endereço'); return; }
    }
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);

    let receiptUrl: string | null = null;
    if (receiptFile) receiptUrl = await uploadReceipt();

    const pickupStore = deliveryType === 'pickup' ? availableStores.find(s => s.id === pickupStoreId) : null;

    const orderData = {
      customerType,
      customerId: customerType === 'registered' ? selectedCustomer?.id : undefined,
      guestInfo: customerType === 'guest' ? guestInfo : undefined,
      items,
      shippingAddress: deliveryType === 'pickup' && pickupStore
        ? {
            recipient_name: guestInfo.name || selectedCustomer?.full_name || '',
            street: pickupStore.street || '',
            number: pickupStore.number || '',
            complement: 'Retirada na Loja',
            neighborhood: pickupStore.neighborhood || '',
            city: pickupStore.city || '',
            state: pickupStore.state || '',
            zip_code: pickupStore.zip_code || '',
          }
        : {
            ...address,
            recipient_name: address.recipient_name || guestInfo.name || selectedCustomer?.full_name || '',
          },
      shippingCost,
      discountCode: discountCode || undefined,
      discountAmount,
      paymentMethod,
      initialStatus,
      source: orderSource,
      adminNotes: adminNotes || undefined,
      paymentReceiptUrl: receiptUrl,
      storeId: deliveryType === 'pickup' ? pickupStoreId : (orderSource === 'store' ? selectedStoreId || undefined : undefined),
      saleDate: saleDate ? new Date(saleDate).toISOString() : undefined,
    };

    const result = await createOrder(orderData);
    if (result.success) {
      toast.success(`Pedido ${result.orderNumber} criado com sucesso!`);
      navigate('/admin/orders');
    } else {
      toast.error(result.error || 'Erro ao criar pedido');
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide">Novo Pedido Manual</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">Crie um pedido manual para vendas externas</p>
        </div>
      </div>

      <form onSubmit={handlePreSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Section */}
            <Card>
              <CardHeader><CardTitle className="text-base font-medium">Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <CustomerSelect
                  customerType={customerType}
                  onCustomerTypeChange={setCustomerType}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  onSearch={searchCustomers}
                  searching={searchingCustomers}
                />
                {customerType === 'guest' && (
                  <GuestCustomerForm guestInfo={guestInfo} onChange={setGuestInfo} />
                )}
              </CardContent>
            </Card>

            {/* Address / Pickup Section */}
            <Card>
              <CardHeader><CardTitle className="text-base font-medium">Entrega</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {/* Delivery type toggle */}
                  <RadioGroup
                    value={deliveryType}
                    onValueChange={(v) => {
                      setDeliveryType(v as 'shipping' | 'pickup');
                      if (v === 'pickup') {
                        // Auto-select if only 1 store
                        if (availableStores.length === 1) setPickupStoreId(availableStores[0].id);
                      }
                    }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${deliveryType === 'shipping' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <RadioGroupItem value="shipping" />
                      <Truck className="h-4 w-4" />
                      <span className="text-sm font-medium">Envio</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${deliveryType === 'pickup' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <RadioGroupItem value="pickup" />
                      <Store className="h-4 w-4" />
                      <span className="text-sm font-medium">Retirada na Loja</span>
                    </label>
                  </RadioGroup>

                  {deliveryType === 'pickup' ? (
                    /* Store pickup selection */
                    <div className="space-y-3">
                      <Label>Selecione a Loja para Retirada</Label>
                      {availableStores.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma loja disponível</p>
                      ) : (
                        <Select value={pickupStoreId} onValueChange={setPickupStoreId}>
                          <SelectTrigger><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                          <SelectContent>
                            {availableStores.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {pickupStoreId && (() => {
                        const store = availableStores.find(s => s.id === pickupStoreId);
                        if (!store) return null;
                        return (
                          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                            <p className="font-medium flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> {store.name}</p>
                            {store.street && <p className="text-muted-foreground">{store.street}{store.number ? `, ${store.number}` : ''}</p>}
                            {store.city && <p className="text-muted-foreground">{store.neighborhood ? `${store.neighborhood} — ` : ''}{store.city}{store.state ? `/${store.state}` : ''}</p>}
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                        <Check className="h-4 w-4" />
                        <span>Frete grátis — Retirada na loja</span>
                      </div>
                    </div>
                  ) : (
                    /* Shipping address fields */
                    <>
                      {/* Saved addresses dropdown */}
                      {savedAddresses.length > 0 && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            Endereços salvos
                          </Label>
                          <Select
                            value={selectedAddressId}
                            onValueChange={(id) => {
                              if (id === 'new') {
                                setSelectedAddressId('');
                                setAddress({ recipient_name: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '' });
                              } else {
                                const addr = savedAddresses.find(a => a.id === id);
                                if (addr) selectSavedAddress(addr);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingAddresses ? 'Carregando...' : 'Selecionar endereço salvo'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">+ Digitar novo endereço</SelectItem>
                              {savedAddresses.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.label} — {a.street}, {a.number} ({a.city}/{a.state})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Destinatário</Label>
                          <Input placeholder="Nome do destinatário" value={address.recipient_name}
                            onChange={(e) => setAddress({ ...address, recipient_name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>CEP *</Label>
                          <div className="relative">
                            <Input
                              placeholder="00000-000"
                              value={address.zip_code}
                              onChange={(e) => setAddress({ ...address, zip_code: formatZipCode(e.target.value) })}
                            />
                            {loadingCEP && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                          <Label>Rua *</Label>
                          <Input placeholder="Nome da rua" value={address.street}
                            onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Número *</Label>
                          <Input placeholder="Nº" value={address.number}
                            onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Complemento</Label>
                          <Input placeholder="Apto, bloco, etc." value={address.complement}
                            onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Bairro *</Label>
                          <Input placeholder="Bairro" value={address.neighborhood}
                            onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cidade *</Label>
                          <Input placeholder="Cidade" value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Estado *</Label>
                          <Select value={address.state} onValueChange={(v) => setAddress({ ...address, state: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {BRAZILIAN_STATES.map((s) => (
                                <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Products Section */}
            <Card>
              <CardHeader><CardTitle className="text-base font-medium">Produtos</CardTitle></CardHeader>
              <CardContent>
                <ProductSelector
                  items={items} onItemsChange={setItems}
                  onSearch={searchProducts} searching={searchingProducts}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Payment Section */}
            <Card>
              <CardHeader><CardTitle className="text-base font-medium">Pagamento</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Origem da Venda</Label>
                  <Select value={orderSource} onValueChange={(v) => { setOrderSource(v as any); if (v !== 'store') setSelectedStoreId(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="store">Loja Física</SelectItem>
                      <SelectItem value="website">Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {orderSource === 'store' && availableStores.length > 0 && (
                  <div className="space-y-2">
                    <Label>Loja Física</Label>
                    <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                      <SelectContent>
                        {availableStores.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Status do Pedido</Label>
                  <Select value={initialStatus} onValueChange={setInitialStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="processing">Processando</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="shipped">Enviado</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data da Venda (opcional)</Label>
                  <Input
                    type="datetime-local"
                    value={saleDate}
                    max={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para usar agora. Use para registrar vendas passadas.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Método de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Coupon validation */}
                <div className="space-y-2">
                  <Label>Cupom de Desconto</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código do cupom"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        if (!e.target.value.trim()) setCouponValidation(null);
                      }}
                    />
                    <Button
                      type="button" variant="outline" size="icon"
                      disabled={validatingCoupon || !discountCode.trim()}
                      onClick={handleValidateCoupon}
                    >
                      {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                  </div>
                  {couponValidation && (
                    <div className={`flex items-center gap-1.5 text-xs ${couponValidation.valid ? 'text-green-600' : 'text-destructive'}`}>
                      {couponValidation.valid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {couponValidation.message}
                    </div>
                  )}
                </div>

                {/* Manual discount (only when no valid coupon) */}
                {!couponValidation?.valid && (
                  <div className="space-y-2">
                    <Label>Desconto Manual (R$)</Label>
                    <Input
                      type="number" step="0.01" min="0" placeholder="0,00"
                      value={manualDiscount || ''}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                {/* Receipt Upload — all payment methods */}
                <div className="space-y-2">
                  <Label>{PAYMENT_LABELS[paymentMethod] || 'Comprovante'}</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReceiptSelect} className="hidden" />
                  {!receiptPreview ? (
                    <Button type="button" variant="outline" className="w-full h-24 border-dashed flex flex-col gap-2"
                      onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Anexar comprovante</span>
                    </Button>
                  ) : (
                    <div className="relative border rounded-lg overflow-hidden">
                      <img src={receiptPreview} alt="Comprovante" className="w-full h-32 object-cover" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={removeReceipt}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Section — hide when pickup */}
            {deliveryType === 'shipping' && (
            <Card>
              <CardHeader><CardTitle className="text-base font-medium">Frete</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loadingShipping && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculando frete...
                  </div>
                )}

                {!loadingShipping && shippingOptions.length > 0 && !useCustomShipping && (
                  <div className="space-y-2">
                    {shippingOptions.map((opt, idx) => (
                      <label key={idx}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedShippingIdx === idx ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                        <input type="radio" name="shipping" checked={selectedShippingIdx === idx}
                          onChange={() => setSelectedShippingIdx(idx)} className="accent-primary" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{opt.service}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{opt.estimated_text}</p>
                        </div>
                        <span className="text-sm font-medium">
                          {opt.is_free ? (
                            <Badge variant="secondary" className="text-xs">Grátis</Badge>
                          ) : formatCurrency(opt.cost)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox id="custom-shipping" checked={useCustomShipping}
                    onCheckedChange={(c) => setUseCustomShipping(!!c)} />
                  <Label htmlFor="custom-shipping" className="font-normal cursor-pointer">
                    Frete personalizado
                  </Label>
                </div>

                {useCustomShipping && (
                  <div className="space-y-2">
                    <Label>Frete Personalizado (R$)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0,00"
                      value={customShipping} onChange={(e) => setCustomShipping(e.target.value)} />
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Summary */}
            <OrderSummary
              items={items}
              shippingCost={shippingCost}
              discountAmount={discountAmount}
              couponCode={couponValidation?.valid ? discountCode : undefined}
              couponMessage={couponValidation?.valid ? couponValidation.message : undefined}
              pickupStoreName={deliveryType === 'pickup' ? availableStores.find(s => s.id === pickupStoreId)?.name : undefined}
            />

            {/* Notes */}
            <Card>
              <CardHeader><CardTitle className="text-base font-medium">Notas Internas</CardTitle></CardHeader>
              <CardContent>
                <Textarea placeholder="Observações sobre o pedido (visível apenas para admins)"
                  value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/admin/orders')}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || items.length === 0}>
                {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>) : 'Criar Pedido'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pedido</DialogTitle>
            <DialogDescription>Revise os dados antes de criar o pedido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Cliente: </span>
              {customerType === 'guest' ? guestInfo.name : selectedCustomer?.full_name}
            </div>
            <div>
              <span className="font-medium">Itens: </span>
              {items.length} produto(s) — {items.reduce((s, i) => s + i.quantity, 0)} unidade(s)
            </div>
            <div>
              <span className="font-medium">Entrega: </span>
              {deliveryType === 'pickup'
                ? `Retirada na Loja — ${availableStores.find(s => s.id === pickupStoreId)?.name || ''}`
                : `${address.street}, ${address.number} — ${address.city}/${address.state}`
              }
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Frete</span>
              <span>{shippingCost > 0 ? formatCurrency(shippingCost) : 'Grátis'}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(Math.max(0, subtotal - discountAmount + shippingCost))}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>Voltar</Button>
            <Button onClick={handleConfirmSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, MapPin, Truck, Check, Plus, User, AlertCircle, Zap } from 'lucide-react';
import { useAddresses, Address } from '@/hooks/useAddresses';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { calculateShipping, formatZipCode, ShippingResult, getAddressFromZip } from '@/lib/shipping';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { PaymentTermsNotice } from './PaymentTermsNotice';

interface BuyNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartItem | null;
}

export function BuyNowModal({ open, onOpenChange, item }: BuyNowModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { addresses, loading: addressesLoading, addAddress } = useAddresses();
  const { createDirectCheckout, setShipping } = useCartStore();

  const [step, setStep] = useState<'profile' | 'address' | 'summary'>('profile');
  const [processing, setProcessing] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    cpf: '',
    birth_date: '',
  });

  // Address
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useManualZip, setUseManualZip] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Casa',
    recipient_name: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // Shipping
  const [calculating, setCalculating] = useState(false);
  const [shippingResult, setShippingResult] = useState<ShippingResult | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setShippingResult(null);
      setProcessing(false);

      if (profile) {
        setProfileForm({
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          cpf: profile.cpf || '',
          birth_date: profile.birth_date || '',
        });
      }

      // Check if profile is complete
      const profileComplete = profile?.full_name && profile?.phone && profile?.cpf;
      if (profileComplete) {
        setStep('address');
      } else {
        setStep('profile');
      }

      // Select default address
      const defaultAddr = addresses.find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setSelectedAddress(defaultAddr);
      } else if (addresses.length > 0) {
        setSelectedAddressId(addresses[0].id);
        setSelectedAddress(addresses[0]);
      } else {
        setSelectedAddressId(null);
        setSelectedAddress(null);
        setUseManualZip(true);
      }
    }
  }, [open, profile, addresses]);

  const profileComplete = profileForm.full_name && profileForm.phone && profileForm.cpf;

  const handleSaveProfile = async () => {
    if (!profileComplete) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setProcessing(true);
    const { error } = await updateProfile(profileForm);
    setProcessing(false);
    if (error) {
      toast.error('Erro ao salvar perfil');
      return;
    }
    setStep('address');
  };

  const handleCepLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    
    setLoadingCep(true);
    const addr = await getAddressFromZip(clean);
    setLoadingCep(false);
    
    if (addr) {
      setNewAddress(prev => ({
        ...prev,
        street: addr.street || prev.street,
        neighborhood: addr.neighborhood || prev.neighborhood,
        city: addr.city,
        state: addr.state,
      }));
    }
  };

  const handleCalculateFromAddress = async (address: Address) => {
    setCalculating(true);
    try {
      const result = await calculateShipping(address.zip_code.replace(/\D/g, ''), {
        subtotal: item ? item.variant.price * item.quantity : 0,
      });
      if (result) {
        setShippingResult(result);
      } else {
        toast.error('Não foi possível calcular o frete');
      }
    } catch (error) {
      setShippingResult(null);
      toast.error(error instanceof Error ? error.message : 'Erro ao calcular frete');
    } finally {
      setCalculating(false);
    }
  };

  const handleSelectAddress = (addressId: string) => {
    const addr = addresses.find(a => a.id === addressId);
    if (addr) {
      setSelectedAddressId(addressId);
      setSelectedAddress(addr);
      setUseManualZip(false);
      setShippingResult(null);
      handleCalculateFromAddress(addr);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.zip_code || !newAddress.street || !newAddress.number || !newAddress.city || !newAddress.state) {
      toast.error('Preencha os campos obrigatórios do endereço');
      return;
    }
    
    setProcessing(true);
    const { data, error } = await addAddress({
      ...newAddress,
      recipient_name: newAddress.recipient_name || profileForm.full_name,
      complement: newAddress.complement || null,
      is_default: addresses.length === 0,
    });
    setProcessing(false);

    if (error) {
      toast.error('Erro ao salvar endereço');
      return;
    }

    if (data) {
      setSelectedAddressId(data.id);
      setSelectedAddress(data);
      setUseManualZip(false);
      handleCalculateFromAddress(data);
    }
  };

  const handleProceedToSummary = () => {
    if (!shippingResult) {
      toast.error('Calcule o frete primeiro');
      return;
    }
    setStep('summary');
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  };

  const handleConfirmCheckout = async () => {
    if (!item || !shippingResult || !selectedAddress) return;

    // Set shipping in cart store
    setShipping(
      shippingResult.cost,
      shippingResult.state,
      shippingResult.city,
      selectedAddress.zip_code,
      shippingResult.estimatedDays,
      {
        recipient_name: selectedAddress.recipient_name,
        street: selectedAddress.street,
        number: selectedAddress.number,
        complement: selectedAddress.complement,
        neighborhood: selectedAddress.neighborhood,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip_code: selectedAddress.zip_code,
      },
      shippingResult.option.service,
      shippingResult.option
    );

    setProcessing(true);
    try {
      const checkoutUrl = await createDirectCheckout(item);
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else {
        toast.error('Erro ao processar compra');
      }
    } catch (error) {
      toast.error('Erro ao finalizar compra', {
        description: error instanceof Error ? error.message : 'Não foi possível abrir o pagamento.',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!item) return null;

  const subtotal = item.variant.price * item.quantity;
  const shippingCost = shippingResult?.cost || 0;
  const total = subtotal + shippingCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'profile' && <><User className="h-5 w-5" /> Seus Dados</>}
            {step === 'address' && <><MapPin className="h-5 w-5" /> Endereço de Entrega</>}
            {step === 'summary' && <><Check className="h-5 w-5" /> Resumo do Pedido</>}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-1 mb-2">
          {['profile', 'address', 'summary'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                ['profile', 'address', 'summary'].indexOf(step) >= i
                  ? 'bg-chrome'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Profile */}
        {step === 'profile' && (
          <div className="space-y-4 py-2">
            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Preencha seus dados para continuar com a compra.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input
                      value={profileForm.full_name}
                      onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <Label>Telefone *</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      type="tel"
                    />
                  </div>
                  <div>
                    <Label>CPF *</Label>
                    <Input
                      value={profileForm.cpf}
                      onChange={e => setProfileForm(p => ({ ...p, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={profileForm.birth_date}
                      onChange={e => setProfileForm(p => ({ ...p, birth_date: e.target.value }))}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={!profileComplete || processing}
                  className="w-full bg-chrome hover:bg-chrome-dark text-white"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Continuar
                </Button>
              </>
            )}
          </div>
        )}

        {/* STEP 2: Address */}
        {step === 'address' && (
          <div className="space-y-4 py-2">
            {/* Saved Addresses */}
            {!addressesLoading && addresses.length > 0 && !useManualZip && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Endereços salvos</Label>
                <RadioGroup
                  value={selectedAddressId || ''}
                  onValueChange={handleSelectAddress}
                >
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-chrome bg-chrome/5'
                          : 'border-border hover:border-chrome/50'
                      }`}
                      onClick={() => handleSelectAddress(address.id)}
                    >
                      <RadioGroupItem value={address.id} id={`addr-${address.id}`} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{address.label}</span>
                          {address.is_default && (
                            <span className="text-xs bg-chrome/10 text-chrome px-2 py-0.5 rounded">Padrão</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {address.street}, {address.number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city} - {address.state} | CEP: {formatZipCode(address.zip_code)}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* New address toggle */}
            <div>
              {addresses.length > 0 && !useManualZip && (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setUseManualZip(true)}>
                  <Plus className="h-4 w-4" /> Novo Endereço
                </Button>
              )}

              {(useManualZip || addresses.length === 0) && (
                <div className="space-y-3 p-3 border rounded-lg">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Novo Endereço
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">CEP *</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="00000-000"
                          value={newAddress.zip_code}
                          onChange={e => {
                            const formatted = formatZipCode(e.target.value);
                            setNewAddress(p => ({ ...p, zip_code: formatted }));
                            if (formatted.replace(/\D/g, '').length === 8) {
                              handleCepLookup(formatted);
                            }
                          }}
                          maxLength={9}
                        />
                        {loadingCep && <Loader2 className="h-4 w-4 animate-spin self-center" />}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Rua *</Label>
                      <Input value={newAddress.street} onChange={e => setNewAddress(p => ({ ...p, street: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Número *</Label>
                      <Input value={newAddress.number} onChange={e => setNewAddress(p => ({ ...p, number: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Complemento</Label>
                      <Input value={newAddress.complement} onChange={e => setNewAddress(p => ({ ...p, complement: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Bairro *</Label>
                      <Input value={newAddress.neighborhood} onChange={e => setNewAddress(p => ({ ...p, neighborhood: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Cidade *</Label>
                      <Input value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Estado *</Label>
                      <Input value={newAddress.state} onChange={e => setNewAddress(p => ({ ...p, state: e.target.value }))} maxLength={2} />
                    </div>
                    <div>
                      <Label className="text-xs">Nome do Destinatário</Label>
                      <Input value={newAddress.recipient_name} onChange={e => setNewAddress(p => ({ ...p, recipient_name: e.target.value }))} placeholder={profileForm.full_name} />
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveNewAddress}
                    disabled={processing || !newAddress.zip_code || !newAddress.street || !newAddress.number || !newAddress.city || !newAddress.state}
                    className="w-full"
                    size="sm"
                  >
                    {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Salvar e Calcular Frete
                  </Button>

                  {addresses.length > 0 && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setUseManualZip(false)}>
                      Voltar aos endereços salvos
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Shipping result */}
            {calculating && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-chrome mr-2" />
                <span className="text-sm text-muted-foreground">Calculando frete...</span>
              </div>
            )}

            {shippingResult && !calculating && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {shippingResult.city}, {shippingResult.state}
                      </span>
                      <span className="font-bold text-sm">
                        {shippingResult.isFreeShipping ? (
                          <span className="text-green-600">GRÁTIS</span>
                        ) : formatPrice(shippingResult.cost)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Prazo: {shippingResult.estimatedDays}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('profile')} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleProceedToSummary}
                disabled={!shippingResult || calculating}
                className="flex-1 bg-chrome hover:bg-chrome-dark text-white"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Summary */}
        {step === 'summary' && (
          <div className="space-y-4 py-2">
            {/* Product */}
            <div className="flex gap-3 p-3 border rounded-lg">
              {item.product.images?.[0] && (
                <img src={item.product.images[0].url} alt={item.product.title} className="w-16 h-16 rounded-md object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2">{item.product.title}</p>
                {item.variant.title !== 'Default' && (
                  <p className="text-xs text-muted-foreground">{item.variant.title}</p>
                )}
                <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
              </div>
              <span className="font-bold text-sm whitespace-nowrap">{formatPrice(subtotal)}</span>
            </div>

            {/* Address */}
            {selectedAddress && (
              <div className="p-3 border rounded-lg text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <MapPin className="h-4 w-4" /> Entrega
                </div>
                <p className="text-muted-foreground">
                  {selectedAddress.street}, {selectedAddress.number}
                  {selectedAddress.complement && ` - ${selectedAddress.complement}`}
                </p>
                <p className="text-muted-foreground">
                  {selectedAddress.neighborhood} - {selectedAddress.city}, {selectedAddress.state}
                </p>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frete</span>
                <span>{shippingResult?.isFreeShipping ? <span className="text-green-600 font-medium">GRÁTIS</span> : formatPrice(shippingCost)}</span>
              </div>
              {shippingResult?.estimatedDays && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Prazo estimado</span>
                  <span>{shippingResult.estimatedDays}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <PaymentTermsNotice />

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('address')} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleConfirmCheckout}
                disabled={processing}
                className="flex-1 bg-chrome hover:bg-chrome-dark text-white"
              >
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Finalizar Compra
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
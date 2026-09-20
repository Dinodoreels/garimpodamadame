import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, MapPin, Truck, Check, Plus, Store } from 'lucide-react';
import { useAddresses, Address } from '@/hooks/useAddresses';
import { calculateShipping, formatZipCode, ShippingResult } from '@/lib/shipping';
import { useCartStore } from '@/stores/cartStore';
import { useActiveStores } from '@/hooks/useStores';
import { toast } from 'sonner';

interface ShippingAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  subtotal: number;
  hasDropshipItems?: boolean;
}

export function ShippingAddressModal({
  open,
  onOpenChange,
  onConfirm,
  subtotal,
  hasDropshipItems = false,
}: ShippingAddressModalProps) {
  const { addresses, loading: addressesLoading } = useAddresses();
  const { setShipping, setPickup } = useCartStore();
  const { data: activeStores } = useActiveStores();

  const [deliveryType, setDeliveryType] = useState<'shipping' | 'pickup'>('shipping');
  const [pickupStoreId, setPickupStoreId] = useState<string>('');

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [manualZipCode, setManualZipCode] = useState('');
  const [useManualZip, setUseManualZip] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [shippingResult, setShippingResult] = useState<ShippingResult | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setShippingResult(null);
      setManualZipCode('');
      setUseManualZip(false);
      setDeliveryType('shipping');
      setPickupStoreId('');
      
      const defaultAddress = addresses.find(a => a.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setSelectedAddress(defaultAddress);
      } else if (addresses.length > 0) {
        setSelectedAddressId(addresses[0].id);
        setSelectedAddress(addresses[0]);
      } else {
        setSelectedAddressId(null);
        setSelectedAddress(null);
        setUseManualZip(true);
      }
    }
  }, [open, addresses]);

  // Auto-calculate when address is selected
  useEffect(() => {
    if (selectedAddressId && !useManualZip && deliveryType === 'shipping') {
      const address = addresses.find(a => a.id === selectedAddressId);
      if (address) {
        setSelectedAddress(address);
        handleCalculateShipping(address.zip_code, address);
      }
    }
  }, [selectedAddressId, useManualZip, deliveryType]);

  const handleCalculateShipping = async (zipCode: string, address?: Address | null) => {
    const cleanZip = zipCode.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      toast.error('CEP inválido', { position: 'top-center' });
      return;
    }

    setCalculating(true);
    try {
      const result = await calculateShipping(cleanZip, {
        subtotal,
        hasDropshipItems,
      });

      if (result) {
        setShippingResult(result);
      } else {
        toast.error('Não foi possível calcular o frete para este CEP', { position: 'top-center' });
      }
    } catch (error) {
      console.error('Shipping calculation error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao calcular frete', { position: 'top-center' });
      setShippingResult(null);
    } finally {
      setCalculating(false);
    }
  };

  const handleManualZipCalculate = () => {
    handleCalculateShipping(manualZipCode, null);
  };

  const handleConfirm = () => {
    if (deliveryType === 'pickup') {
      if (!pickupStoreId) {
        toast.error('Selecione uma loja para retirada', { position: 'top-center' });
        return;
      }
      const store = (activeStores || []).find(s => s.id === pickupStoreId);
      if (store) {
        setPickup(store.id, store.name);
      }
      onOpenChange(false);
      onConfirm();
      return;
    }

    if (!shippingResult) {
      toast.error('Calcule o frete primeiro', { position: 'top-center' });
      return;
    }

    const addressToSave = selectedAddress
      ? {
          recipient_name: selectedAddress.recipient_name,
          street: selectedAddress.street,
          number: selectedAddress.number,
          complement: selectedAddress.complement,
          neighborhood: selectedAddress.neighborhood,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zip_code: selectedAddress.zip_code,
        }
      : {
          recipient_name: '',
          street: '',
          number: '',
          complement: null,
          neighborhood: '',
          city: shippingResult.city,
          state: shippingResult.state,
          zip_code: manualZipCode.replace(/\D/g, ''),
        };

    setShipping(
      shippingResult.cost,
      shippingResult.state,
      shippingResult.city,
      addressToSave.zip_code,
      shippingResult.estimatedDays,
      addressToSave,
      shippingResult.option.service,
      shippingResult.option
    );

    onOpenChange(false);
    onConfirm();
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const stores = activeStores || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Entrega
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja receber seu pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Delivery type toggle */}
          <RadioGroup
            value={deliveryType}
            onValueChange={(v) => {
              setDeliveryType(v as 'shipping' | 'pickup');
              setShippingResult(null);
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
              <span className="text-sm font-medium">Retirar na Loja</span>
            </label>
          </RadioGroup>

          {deliveryType === 'pickup' ? (
            /* Store pickup */
            <div className="space-y-3">
              {stores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma loja disponível para retirada</p>
              ) : (
                <RadioGroup value={pickupStoreId} onValueChange={setPickupStoreId}>
                  {stores.map((store) => (
                    <div
                      key={store.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        pickupStoreId === store.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setPickupStoreId(store.id)}
                    >
                      <RadioGroupItem value={store.id} id={`store-${store.id}`} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5" />
                          {store.name}
                        </span>
                        {store.street && (
                          <p className="text-sm text-muted-foreground">
                            {store.street}{store.number ? `, ${store.number}` : ''}
                          </p>
                        )}
                        {store.city && (
                          <p className="text-sm text-muted-foreground">
                            {store.neighborhood ? `${store.neighborhood} — ` : ''}{store.city}{store.state ? `/${store.state}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {pickupStoreId && (
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                  <Check className="h-4 w-4" />
                  <span>Frete grátis — Retirada na loja</span>
                </div>
              )}
            </div>
          ) : (
            /* Shipping flow */
            <>
              {/* Saved Addresses */}
              {!addressesLoading && addresses.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Endereços salvos</Label>
                  <RadioGroup
                    value={useManualZip ? '' : selectedAddressId || ''}
                    onValueChange={(value) => {
                      setSelectedAddressId(value);
                      setUseManualZip(false);
                      setShippingResult(null);
                    }}
                  >
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAddressId === address.id && !useManualZip
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedAddressId(address.id);
                          setUseManualZip(false);
                          setShippingResult(null);
                        }}
                      >
                        <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{address.label}</span>
                            {address.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Padrão
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {address.street}, {address.number}
                            {address.complement && ` - ${address.complement}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.neighborhood} - {address.city}, {address.state}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CEP: {formatZipCode(address.zip_code)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Manual ZIP Code */}
              <div className="space-y-3">
                {addresses.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    useManualZip ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setUseManualZip(true);
                    setSelectedAddressId(null);
                    setSelectedAddress(null);
                    setShippingResult(null);
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Digitar outro CEP</span>
                  </div>

                  {useManualZip && (
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="00000-000"
                        value={manualZipCode}
                        onChange={(e) => setManualZipCode(formatZipCode(e.target.value))}
                        maxLength={9}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleManualZipCalculate}
                        disabled={calculating || manualZipCode.replace(/\D/g, '').length !== 8}
                      >
                        {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calcular'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Result */}
              {calculating && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Calculando frete...</span>
                </div>
              )}

              {shippingResult && !calculating && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                      <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">
                          {shippingResult.city}, {shippingResult.state}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Frete: </span>
                          {shippingResult.isFreeShipping ? (
                            <span className="font-semibold text-green-600">GRÁTIS</span>
                          ) : (
                            <span className="font-semibold">{formatPrice(shippingResult.cost)}</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Prazo: {shippingResult.estimatedDays}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Confirm Button */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={deliveryType === 'shipping' ? (!shippingResult || calculating) : !pickupStoreId}
            className="flex-1"
          >
            Confirmar e Finalizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

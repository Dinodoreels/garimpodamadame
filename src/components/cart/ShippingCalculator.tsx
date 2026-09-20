import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Truck, Check, Gift, Package } from 'lucide-react';
import { calculateShippingOptions, formatZipCode, getShippingErrorMessage, type ShippingOption, type ShippingCalcResponse } from '@/lib/shipping';
import { useCartStore } from '@/stores/cartStore';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuth } from '@/hooks/useAuth';
import { useFreeShippingSettings } from '@/hooks/useShippingSettings';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface ShippingCalculatorProps {
  hasDropshipItems?: boolean;
}

export function ShippingCalculator({ hasDropshipItems = false }: ShippingCalculatorProps) {
  const { user } = useAuth();
  const { addresses } = useAddresses();
  const { data: freeShippingSettings } = useFreeShippingSettings();
  const { 
    shippingCost, 
    shippingState, 
    shippingCity, 
    shippingEstimate,
    shippingZipCode,
    setShipping, 
    clearShipping,
    getTotalPrice,
    items
  } = useCartStore();
  
  const [zipInput, setZipInput] = useState(shippingZipCode || '');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [calcResponse, setCalcResponse] = useState<ShippingCalcResponse | null>(null);

  const subtotal = getTotalPrice();
  const freeShippingEnabled = freeShippingSettings?.enabled ?? false;
  const freeShippingMinValue = freeShippingSettings?.min_value ?? 500;
  const amountToFreeShipping = freeShippingEnabled ? Math.max(0, freeShippingMinValue - subtotal) : 0;
  const qualifiesForFreeShipping = freeShippingEnabled && subtotal >= freeShippingMinValue;
  const progressToFreeShipping = freeShippingEnabled 
    ? Math.min(100, (subtotal / freeShippingMinValue) * 100) 
    : 0;

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatZipCode(e.target.value);
    setZipInput(formatted);
    setError(null);
    
    if (shippingZipCode && formatted !== shippingZipCode) {
      clearShipping();
      setShippingOptions([]);
      setSelectedService(null);
      setCalcResponse(null);
    }
  };

  const doCalculate = async (zip: string) => {
    const cleanZip = zip.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      setError('CEP inválido');
      return;
    }

    setIsCalculating(true);
    setError(null);
    clearShipping();
    setShippingOptions([]);
    setSelectedService(null);
    setCalcResponse(null);

    try {
      const cartItems = items.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
      }));

      const result = await calculateShippingOptions(cleanZip, {
        subtotal,
        hasDropshipItems,
        items: cartItems,
      });
      
      if (result && result.options.length > 0) {
        setCalcResponse(result);
        setShippingOptions(result.options);
        // Auto-select cheapest
        const cheapest = result.options[0];
        setSelectedService(cheapest.service_code);
        setShipping(
          cheapest.cost, 
          result.address?.state || '', 
          result.address?.city || '', 
          formatZipCode(cleanZip), 
          cheapest.estimated_text,
          undefined,
          cheapest.service,
          cheapest
        );
      } else {
        setCalcResponse(result);
        setError(getShippingErrorMessage(result));
      }
    } catch {
      clearShipping();
      setError('Erro ao calcular frete');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCalculate = () => doCalculate(zipInput);

  const handleAddressSelect = async (addressId: string) => {
    const address = addresses?.find(a => a.id === addressId);
    if (!address) return;
    const formatted = formatZipCode(address.zip_code);
    setZipInput(formatted);
    await doCalculate(address.zip_code);
  };

  const handleSelectService = (serviceCode: string) => {
    const option = shippingOptions.find(o => o.service_code === serviceCode);
    if (!option || !calcResponse) return;
    
    setSelectedService(serviceCode);
    setShipping(
      option.cost,
      calcResponse.address?.state || '',
      calcResponse.address?.city || '',
      zipInput,
      option.estimated_text,
      undefined,
      option.service,
      option
    );
  };

  // Recalculate when subtotal changes
  useEffect(() => {
    if (shippingZipCode && shippingOptions.length > 0) {
      const cleanZip = shippingZipCode.replace(/\D/g, '');
      const cartItems = items.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
      }));
      
      calculateShippingOptions(cleanZip, { subtotal, hasDropshipItems, items: cartItems }).then(result => {
        if (result && result.options.length > 0) {
          setCalcResponse(result);
          setShippingOptions(result.options);
          // Update selected option
          const current = result.options.find(o => o.service_code === selectedService);
          if (current) {
            setShipping(current.cost, result.address?.state || '', result.address?.city || '', shippingZipCode, current.estimated_text, undefined, current.service, current);
          } else {
            const cheapest = result.options[0];
            setSelectedService(cheapest.service_code);
            setShipping(cheapest.cost, result.address?.state || '', result.address?.city || '', shippingZipCode, cheapest.estimated_text, undefined, cheapest.service, cheapest);
          }
        } else {
          clearShipping();
          setShippingOptions([]);
          setSelectedService(null);
          setCalcResponse(result);
          setError(getShippingErrorMessage(result));
        }
      });
    }
  }, [subtotal]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
      {/* Free Shipping Progress */}
      {freeShippingEnabled && (
        <div className="space-y-2">
          {qualifiesForFreeShipping ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Gift className="h-4 w-4" />
              Parabéns! Você ganhou frete grátis! 🎉
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Frete grátis acima de {formatPrice(freeShippingMinValue)}
                </span>
                <span className="font-medium text-chrome">
                  Faltam {formatPrice(amountToFreeShipping)}
                </span>
              </div>
              <Progress value={progressToFreeShipping} className="h-2" />
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4" />
        Calcular Frete
      </div>

      {/* Saved Addresses */}
      {user && addresses && addresses.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Usar endereço salvo</Label>
          <Select onValueChange={handleAddressSelect}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecione um endereço" />
            </SelectTrigger>
            <SelectContent>
              {addresses.map((address) => (
                <SelectItem key={address.id} value={address.id}>
                  {address.label} - {address.city}, {address.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground text-center">ou digite o CEP</div>
        </div>
      )}

      {/* ZIP Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          value={zipInput}
          onChange={handleZipChange}
          className="h-12 text-base touch-manipulation"
          maxLength={9}
        />
        <Button 
          onClick={handleCalculate}
          disabled={isCalculating || zipInput.replace(/\D/g, '').length !== 8}
          className="h-12 px-6 touch-manipulation"
        >
          {isCalculating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Calcular'
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Shipping Options */}
      {shippingOptions.length > 0 && calcResponse?.address && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-600" />
            <span>{calcResponse.address.city}, {calcResponse.address.state}</span>
          </div>

          <div className="space-y-2">
            {shippingOptions.map((option) => (
              <button
                key={option.service_code}
                onClick={() => handleSelectService(option.service_code)}
                className={cn(
                  "w-full p-3 rounded-lg border text-left transition-all",
                  selectedService === option.service_code
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50 bg-background"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-sm">{option.carrier} - {option.service}</span>
                      <p className="text-xs text-muted-foreground">{option.estimated_text}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {option.is_free ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs line-through text-muted-foreground">
                          {formatPrice(option.original_cost)}
                        </span>
                        <span className="font-bold text-green-600 text-sm">GRÁTIS</span>
                      </div>
                    ) : (
                      <span className="font-bold text-sm">{formatPrice(option.cost)}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Dropship notice */}
          {hasDropshipItems && calcResponse.dropship_extra_days > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 p-2 bg-amber-50 rounded">
              <Package className="h-3 w-3" />
              <span>Inclui +{calcResponse.dropship_extra_days} dias para itens sob encomenda</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

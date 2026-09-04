import { useEffect, useState } from 'react';
import { Loader2, MapPin, Truck, Check, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  calculateShippingOptions,
  formatZipCode,
  type ShippingCalcResponse,
  type ShippingOption,
} from '@/lib/shipping';
import { useAuth } from '@/hooks/useAuth';
import { useAddresses } from '@/hooks/useAddresses';
import { useCatalogShippingCep } from '@/hooks/useCatalogShippingCep';

interface ProductShippingEstimateProps {
  productId: string;
  unitPrice: number;
  quantity?: number;
  hasDropshipItems?: boolean;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

export function ProductShippingEstimate({
  productId,
  unitPrice,
  quantity = 1,
  hasDropshipItems = false,
}: ProductShippingEstimateProps) {
  const { user } = useAuth();
  const { addresses } = useAddresses();
  const { cep: storedCep, setCep: persistCep } = useCatalogShippingCep();

  const [zipInput, setZipInput] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ShippingCalcResponse | null>(null);

  // Pre-fill from default address (auth) or persisted catalog CEP
  useEffect(() => {
    if (zipInput) return;
    const defaultAddr = addresses?.find((a) => a.is_default) || addresses?.[0];
    if (defaultAddr?.zip_code) {
      const formatted = formatZipCode(defaultAddr.zip_code);
      setZipInput(formatted);
      void doCalculate(defaultAddr.zip_code);
      return;
    }
    if (storedCep) {
      setZipInput(storedCep);
      void doCalculate(storedCep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, storedCep]);

  const doCalculate = async (zip: string) => {
    const cleanZip = zip.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      setError('CEP inválido');
      return;
    }
    setIsCalculating(true);
    setError(null);
    try {
      const result = await calculateShippingOptions(cleanZip, {
        subtotal: unitPrice * quantity,
        hasDropshipItems,
        items: [{ product_id: productId, quantity }],
      });
      if (result && result.options.length > 0) {
        setResponse(result);
        persistCep(formatZipCode(cleanZip));
      } else {
        setError('CEP não encontrado ou sem opções de frete');
        setResponse(null);
      }
    } catch {
      setError('Erro ao calcular frete');
      setResponse(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZipInput(formatZipCode(e.target.value));
    setError(null);
  };

  const handleCalculate = () => doCalculate(zipInput);

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4" />
        Calcular Frete e Prazo
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          value={zipInput}
          onChange={handleChange}
          className="h-11"
          maxLength={9}
        />
        <Button
          onClick={handleCalculate}
          disabled={isCalculating || zipInput.replace(/\D/g, '').length !== 8}
          variant="outline"
          className="h-11 px-5"
        >
          {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calcular'}
        </Button>
      </div>

      {!user && addresses?.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Faça login para usar seus endereços salvos.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {response?.address && response.options.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span>{response.address.city}, {response.address.state}</span>
          </div>
          <div className="space-y-1.5">
            {response.options.map((opt: ShippingOption) => (
              <div
                key={opt.service_code}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded border bg-background text-sm'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{opt.carrier} — {opt.service}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.estimated_text}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {opt.is_free ? (
                    <span className="font-bold text-green-600 text-sm">GRÁTIS</span>
                  ) : (
                    <span className="font-semibold">{formatPrice(opt.cost)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasDropshipItems && response.dropship_extra_days > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-700 p-2 bg-amber-50 rounded">
              <Package className="h-3 w-3" />
              <span>+{response.dropship_extra_days} dias para itens sob encomenda</span>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            Valores e prazos estimados. Confirmação no fechamento do pedido.
          </p>
        </div>
      )}
    </div>
  );
}
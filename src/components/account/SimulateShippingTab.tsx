import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Truck, Loader2, Check, Package, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAddresses, type Address } from '@/hooks/useAddresses';
import { useProducts, type Product } from '@/hooks/useProducts';
import {
  calculateShippingOptions,
  getShippingErrorMessage,
  type ShippingCalcResponse,
  type ShippingOption,
} from '@/lib/shipping';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

export function SimulateShippingTab() {
  const { addresses, loading: addrLoading } = useAddresses();
  const { data: products, isLoading: prodLoading } = useProducts(100);

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShippingCalcResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAddress: Address | undefined = useMemo(
    () => addresses?.find((a) => a.id === selectedAddressId),
    [addresses, selectedAddressId]
  );
  const selectedProduct: Product | undefined = useMemo(
    () => products?.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const handleSimulate = async () => {
    if (!selectedAddress || !selectedProduct) {
      setError('Selecione um endereço e um produto');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const cleanZip = selectedAddress.zip_code.replace(/\D/g, '');
      const data = await calculateShippingOptions(cleanZip, {
        subtotal: selectedProduct.price * quantity,
        items: [{ product_id: selectedProduct.id, quantity }],
      });
      if (data && data.options.length > 0) {
        setResult(data);
      } else {
        setError(getShippingErrorMessage(data));
      }
    } catch {
      setError('Erro ao calcular frete.');
    } finally {
      setLoading(false);
    }
  };

  if (addrLoading || prodLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Simular Frete
        </CardTitle>
        <CardDescription>
          Veja o valor e prazo de entrega para qualquer endereço salvo antes de comprar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Addresses */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço de entrega
          </Label>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 border rounded-lg">
              Você ainda não cadastrou nenhum endereço. Adicione um na aba <strong>Configurações</strong>.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-all',
                    selectedAddressId === addr.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{addr.label}</p>
                    {addr.is_default && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {addr.street}, {addr.number} — {addr.neighborhood}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {addr.city}/{addr.state} · CEP {addr.zip_code}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product */}
        <div className="space-y-2">
          <Label>Produto</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              {(products || []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title} — {formatPrice(p.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label>Quantidade</Label>
          <div className="flex items-center gap-2 w-fit">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1')))}
              className="w-16 h-9 text-center"
              min={1}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSimulate}
          disabled={loading || !selectedAddress || !selectedProduct}
          className="w-full sm:w-auto"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
          Simular Frete
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result?.address && result.options.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              Opções para {result.address.city}, {result.address.state}
            </div>
            <div className="space-y-2">
              {result.options.map((opt: ShippingOption) => (
                <div
                  key={opt.service_code}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{opt.carrier} — {opt.service}</p>
                      <p className="text-xs text-muted-foreground">{opt.estimated_text}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {opt.is_free ? (
                      <span className="font-bold text-green-600">GRÁTIS</span>
                    ) : (
                      <span className="font-semibold">{formatPrice(opt.cost)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {result.dropship_extra_days > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700 p-2 bg-amber-50 rounded">
                <Package className="h-3 w-3" />
                +{result.dropship_extra_days} dias para itens sob encomenda
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
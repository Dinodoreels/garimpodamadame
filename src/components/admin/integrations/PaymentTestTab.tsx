import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';

export function PaymentTestTab() {
  const { toast } = useToast();
  const { data: products, isLoading: loadingProducts } = useProducts(100);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.find(v => v.id === selectedVariantId);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedVariantId('');
    setCheckoutUrl('');
    const product = products?.find(p => p.id === productId);
    if (product?.variants.length === 1) {
      setSelectedVariantId(product.variants[0].id);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedProduct || !selectedVariant) {
      toast({ variant: 'destructive', title: 'Selecione um produto e variante' });
      return;
    }

    setLoading(true);
    setCheckoutUrl('');

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          items: [{
            product_id: selectedProduct.id,
            variant_id: selectedVariant.id,
            quantity,
            title: selectedProduct.title,
            variant_title: selectedVariant.title !== 'Default' ? selectedVariant.title : undefined,
            price: selectedVariant.price,
            image_url: selectedProduct.images?.[0]?.url || undefined,
          }],
          shipping_cost: 0,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');

      setCheckoutUrl(data.checkout_url);
      setOrderNumber(data.order_number);
      toast({ title: 'Link gerado!', description: `Pedido ${data.order_number} criado com sucesso.` });
    } catch (err: any) {
      console.error('Payment test error:', err);
      toast({ variant: 'destructive', title: 'Erro ao gerar link', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-medium">Teste de Pagamento</CardTitle>
          </div>
          <CardDescription>
            Gere um link de pagamento do Mercado Pago para testar o fluxo de checkout sem calcular frete.
            O frete será fixado em R$ 0,00.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product selector */}
          <div className="space-y-2">
            <Label>Produto</Label>
            <Select value={selectedProductId} onValueChange={handleProductChange} disabled={loadingProducts}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProducts ? 'Carregando...' : 'Selecione um produto'} />
              </SelectTrigger>
              <SelectContent>
                {products?.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} — {formatPrice(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variant selector */}
          {selectedProduct && selectedProduct.variants.length > 1 && (
            <div className="space-y-2">
              <Label>Variante</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a variante" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.variants.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.title} — {formatPrice(v.price)} (estoque: {v.inventory_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32"
            />
          </div>

          {/* Summary */}
          {selectedVariant && (
            <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Produto:</span>
                <span className="font-medium">{selectedProduct?.title}</span>
              </div>
              {selectedVariant.title !== 'Default' && (
                <div className="flex justify-between">
                  <span>Variante:</span>
                  <span>{selectedVariant.title}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Qtd:</span>
                <span>{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete:</span>
                <span className="text-green-600">Grátis (teste)</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                <span>Total:</span>
                <span>{formatPrice(selectedVariant.price * quantity)}</span>
              </div>
            </div>
          )}

          <Button onClick={handleGenerateLink} disabled={loading || !selectedVariant} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingBag className="h-4 w-4 mr-2" />}
            Gerar Link de Pagamento
          </Button>

          {/* Result */}
          {checkoutUrl && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm font-medium text-green-700">
                  ✅ Link gerado — Pedido #{orderNumber}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input value={checkoutUrl} readOnly className="flex-1 text-xs" />
                  <Button variant="outline" size="sm" onClick={() => window.open(checkoutUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Abrir
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Abra o link acima para testar o fluxo de pagamento no Mercado Pago.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BadgePercent, Calculator, PackageSearch, Pencil, Search, TrendingUp } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PricingCalculator, type CalcResult } from '@/components/admin/PricingCalculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUpdateProduct } from '@/hooks/useProductAdmin';
import { useProductCategories } from '@/hooks/useProductCategories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type PricingItem = {
  id: string;
  title: string;
  handle: string;
  category: string;
  price: number;
  cost: number;
  margin: number;
  variantId: string | null;
  variantTitle: string;
  vendor: string | null;
  status: 'healthy' | 'warning' | 'critical' | 'missing';
  compareAtPrice: number | null;
  product: ReturnType<typeof useProducts>['data'] extends Array<infer T> ? T : never;
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Pricing() {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useProductCategories();
  const updateProduct = useUpdateProduct();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [calculatorResult, setCalculatorResult] = useState<CalcResult | null>(null);

  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.value, c.label));
    return map;
  }, [categories]);

  const pricingItems = useMemo<PricingItem[]>(() => {
    return products
      .map((product) => {
        const primaryVariant = product.variants?.[0] ?? null;
        const cost = Number(primaryVariant?.cost ?? 0);
        const price = Number(primaryVariant?.price ?? product.price ?? 0);
        const margin = cost > 0 && price > 0 ? ((price - cost) / price) * 100 : 0;

        let status: PricingItem['status'] = 'missing';
        if (cost > 0 && price > 0) {
          status = margin >= 30 ? 'healthy' : margin >= 15 ? 'warning' : 'critical';
        }

        const catValue = product.product_type || '';
        const catLabel = catValue
          ? (categoryLabelMap.get(catValue) || catValue)
          : 'Sem categoria';

        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          category: catLabel,
          price,
          cost,
          margin,
          variantId: primaryVariant?.id ?? null,
          variantTitle: primaryVariant?.title || 'Principal',
          vendor: product.vendor,
          status,
          compareAtPrice: primaryVariant?.compare_at_price ?? product.compare_at_price,
          product,
        };
      })
      .sort((a, b) => {
        const priority = { critical: 0, warning: 1, healthy: 2, missing: 3 };
        return priority[a.status] - priority[b.status] || a.margin - b.margin;
      });
  }, [products, categoryLabelMap]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pricingItems.filter((item) => {
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterCategory) {
        if (filterCategory === '__none__') {
          if (item.category !== 'Sem categoria') return false;
        } else if (item.category !== filterCategory) return false;
      }
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.handle.toLowerCase().includes(query) ||
        item.vendor?.toLowerCase().includes(query)
      );
    });
  }, [pricingItems, search, filterCategory, filterStatus]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce<Record<string, PricingItem[]>>((acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filteredProducts]);

  const groupedEntries = useMemo(
    () => Object.entries(groupedProducts).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')),
    [groupedProducts]
  );

  const selectedProduct = useMemo(() => {
    if (!pricingItems.length) return null;
    return pricingItems.find((item) => item.id === selectedProductId) ?? pricingItems[0];
  }, [pricingItems, selectedProductId]);

  const summary = useMemo(() => {
    const withCost = pricingItems.filter((item) => item.cost > 0 && item.price > 0);
    const averageMargin = withCost.length
      ? withCost.reduce((acc, item) => acc + item.margin, 0) / withCost.length
      : 0;

    return {
      withCost: withCost.length,
      averageMargin,
      lowMargin: pricingItems.filter((item) => item.status === 'critical').length,
      missingData: pricingItems.filter((item) => item.status === 'missing').length,
    };
  }, [pricingItems]);

  const currentProfit = selectedProduct && selectedProduct.price > 0
    ? selectedProduct.price - selectedProduct.cost
    : 0;

  const handleUsePrice = async (price: number) => {
    if (!selectedProduct) return;

    const baseProduct = selectedProduct.product;
    const updatedVariants = (baseProduct.variants || []).map((variant, index) => ({
      title: variant.title,
      sku: variant.sku || undefined,
      price: index === 0 ? price : variant.price,
      compare_at_price: variant.compare_at_price || undefined,
      cost: variant.cost || 0,
      option1: variant.option1 || undefined,
      option2: variant.option2 || undefined,
      option3: variant.option3 || undefined,
      inventory_quantity: variant.inventory_quantity,
      is_available: variant.is_available,
      inventory_policy: (variant.inventory_policy as 'deny' | 'continue') || 'deny',
    }));

    try {
      await updateProduct.mutateAsync({
        id: baseProduct.id,
        data: {
          title: baseProduct.title,
          description: baseProduct.description || undefined,
          handle: baseProduct.handle,
          product_type: baseProduct.product_type || undefined,
          vendor: baseProduct.vendor || undefined,
          price,
          compare_at_price: baseProduct.compare_at_price || undefined,
          status: (baseProduct.status as 'active' | 'draft' | 'archived') || 'active',
          is_available: baseProduct.is_available,
          images: (baseProduct.images || []).map((img) => ({
            url: img.url,
            alt_text: img.alt_text || undefined,
            position: img.position,
          })),
          options: (baseProduct.options || []).map((option) => ({
            name: option.name,
            values: option.values,
            position: option.position,
          })),
          variants: updatedVariants,
        },
      });

      toast.success('Preço atualizado com sucesso.');
    } catch {
      // toast handled in mutation
    }
  };

  const statusLabel = (status: PricingItem['status']) => {
    if (status === 'healthy') return 'Saudável';
    if (status === 'warning') return 'Atenção';
    if (status === 'critical') return 'Crítica';
    return 'Sem dados';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calculadora de Precificação"
        subtitle="Analise margens, identifique produtos com preço apertado e ajuste o valor ideal mais rápido"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Com custo e preço</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{summary.withCost}</p>
            </div>
            <PackageSearch className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Margem média</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{summary.averageMargin.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Margem crítica</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{summary.lowMargin}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sem base completa</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{summary.missingData}</p>
            </div>
            <BadgePercent className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {selectedProduct ? selectedProduct.title : 'Simulação de preço'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProduct && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Produto selecionado</p>
                    <Badge variant="outline">{statusLabel(selectedProduct.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedProduct.variantTitle}</p>
                  <p className="text-xs text-muted-foreground">{selectedProduct.vendor || 'Sem fornecedor'}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumo atual</p>
                  <div className="mt-2 space-y-1 text-sm text-foreground">
                    <div className="flex justify-between"><span>Custo</span><span>R$ {formatBRL(selectedProduct.cost)}</span></div>
                    <div className="flex justify-between"><span>Preço</span><span>R$ {formatBRL(selectedProduct.price)}</span></div>
                    <div className="flex justify-between"><span>Lucro bruto</span><span>R$ {formatBRL(currentProfit)}</span></div>
                    <div className="flex justify-between"><span>Margem bruta</span><span>{selectedProduct.margin.toFixed(1)}%</span></div>
                  </div>
                </div>
              </div>
            )}

            <PricingCalculator
              initialCost={selectedProduct?.cost || 0}
              initialPrice={selectedProduct?.price || 0}
              onCalculationChange={setCalculatorResult}
              onUsePrice={handleUsePrice}
            />

            {selectedProduct && calculatorResult && (
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Diferença para a meta</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {calculatorResult.suggestedPrice > selectedProduct.price ? '+' : ''}
                      R$ {formatBRL(calculatorResult.suggestedPrice - selectedProduct.price)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {calculatorResult.suggestedPrice > selectedProduct.price
                        ? 'O preço atual está abaixo do ideal.'
                        : 'O preço atual já está dentro ou acima da meta.'}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleUsePrice(calculatorResult.suggestedPrice)}
                    disabled={updateProduct.isPending}
                  >
                    {updateProduct.isPending ? 'Salvando...' : 'Aplicar preço ideal'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Análise dos produtos</CardTitle>
            <div className="mt-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, referência ou fornecedor..."
                  className="pl-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={filterCategory || '__all__'} onValueChange={(v) => setFilterCategory(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as categorias</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                    ))}
                    <SelectItem value="__none__" className="text-destructive">Sem categoria</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus || '__all__'} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Margem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as margens</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="warning">Atenção</SelectItem>
                    <SelectItem value="healthy">Saudável</SelectItem>
                    <SelectItem value="missing">Sem dados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando produtos...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum produto encontrado para essa busca
              </p>
            ) : (
              <div className="space-y-4">
                {groupedEntries.map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border bg-background/95 px-3 py-2 backdrop-blur">
                      <div>
                        <p className="text-sm font-medium text-foreground">{category}</p>
                        <p className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
                      </div>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>

                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-lg border p-3 transition-colors hover:bg-muted/30",
                          selectedProduct?.id === item.id && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProductId(item.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-foreground">{item.title}</p>
                              <Badge variant="outline">{statusLabel(item.status)}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{item.vendor || 'Sem fornecedor'} • {item.variantTitle}</p>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <span>Custo: <strong className="text-foreground">R$ {formatBRL(item.cost)}</strong></span>
                              <span>Preço: <strong className="text-foreground">R$ {formatBRL(item.price)}</strong></span>
                              <span>Margem: <strong className="text-foreground">{item.margin.toFixed(1)}%</strong></span>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn(
                            "shrink-0",
                            item.status === 'healthy' && 'border-primary/30 text-primary',
                            item.status === 'warning' && 'border-border text-foreground',
                            item.status === 'critical' && 'border-destructive/30 text-destructive'
                          )}>
                            {item.status === 'missing' ? 'Sem base' : `${item.margin.toFixed(0)}%`}
                          </Badge>
                          </div>
                        </button>
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => navigate(`/admin/products?edit=${item.id}`)}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Editar produto
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Product, ProductVariant } from '@/hooks/useProducts';
import { ManualOrderItem } from '@/hooks/useManualOrder';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductSelectorProps {
  items: ManualOrderItem[];
  onItemsChange: (items: ManualOrderItem[]) => void;
  onSearch: (query: string) => Promise<Product[]>;
  searching: boolean;
}

export function ProductSelector({
  items,
  onItemsChange,
  onSearch,
  searching,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [highlightVariantId, setHighlightVariantId] = useState<string | null>(null);
  const itemsListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const search = async () => {
      if (searchQuery.length >= 2) {
        const products = await onSearch(searchQuery);
        setResults(products);
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, onSearch]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariantId(product.variants?.[0]?.id || '');
    setShowResults(false);
    setSearchQuery('');
  };

  const handleAddItem = () => {
    if (!selectedProduct || !selectedVariantId) return;

    const variant = selectedProduct.variants?.find(v => v.id === selectedVariantId);
    if (!variant) return;

    const existingIndex = items.findIndex(item => item.variant.id === selectedVariantId);
    
    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...items];
      newItems[existingIndex].quantity += quantity;
      onItemsChange(newItems);
    } else {
      // Add new item
      onItemsChange([...items, {
        product: selectedProduct,
        variant,
        quantity,
      }]);
    }

    // Toast de confirmação
    toast.success(
      `${selectedProduct.title} adicionado ao pedido`,
      { description: `Quantidade: ${quantity}${variant.title && variant.title !== 'Default' ? ` • ${variant.title}` : ''}` }
    );

    // Destaque visual no item
    setHighlightVariantId(variant.id);
    setTimeout(() => setHighlightVariantId(null), 1800);

    // Scroll suave até a lista
    setTimeout(() => {
      itemsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    // Mantém o produto selecionado para permitir adicionar variantes/quantidades em sequência
    setQuantity(1);
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    const newItems = [...items];
    newItems[index].quantity = newQuantity;
    onItemsChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Produtos
        </Label>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelectProduct(product)}
                className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 transition-colors"
              >
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.title}
                    className="w-10 h-10 object-cover rounded bg-muted"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{product.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected product - choose variant */}
      {selectedProduct && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <div className="flex items-center gap-3">
            {selectedProduct.images?.[0]?.url && (
              <img
                src={selectedProduct.images[0].url}
                alt={selectedProduct.title}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <p className="font-medium">{selectedProduct.title}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {selectedProduct.variants && selectedProduct.variants.length > 1 && (
              <div className="space-y-2">
                <Label>Variante</Label>
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct.variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.title} - {formatCurrency(variant.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedVariantId}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div ref={itemsListRef} className="border rounded-lg divide-y">
          <div className="p-3 flex items-center justify-between bg-muted/40 text-sm">
            <span className="font-medium">
              {items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'itens'} no pedido
            </span>
            <span className="text-muted-foreground">
              Subtotal: {formatCurrency(items.reduce((s, i) => s + i.variant.price * i.quantity, 0))}
            </span>
          </div>
          {items.map((item, index) => (
            <div
              key={item.variant.id}
              className={cn(
                'p-4 flex items-center gap-4 transition-colors duration-700',
                highlightVariantId === item.variant.id && 'bg-primary/10 ring-1 ring-primary/40'
              )}
            >
              {item.product.images?.[0]?.url && (
                <img
                  src={item.product.images[0].url}
                  alt={item.product.title}
                  className="w-12 h-12 object-cover rounded bg-muted"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.product.title}</p>
                {item.variant.title !== 'Default' && (
                  <p className="text-sm text-muted-foreground">{item.variant.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-medium w-24 text-right">
                {formatCurrency(item.variant.price * item.quantity)}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleRemoveItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !selectedProduct && (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p>Nenhum produto adicionado</p>
          <p className="text-sm">Busque e adicione produtos ao pedido</p>
        </div>
      )}
    </div>
  );
}

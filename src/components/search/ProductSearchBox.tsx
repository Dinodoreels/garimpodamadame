import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/hooks/useProducts';
import { useSmartProductSearch } from '@/hooks/useSmartProductSearch';
import { cn } from '@/lib/utils';

interface ProductSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  showSuggestions?: boolean;
  onNavigate?: () => void;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductSearchBox({
  value,
  onChange,
  onSubmit,
  className,
  inputClassName,
  placeholder = 'O que você está procurando?',
  showSuggestions = true,
  onNavigate,
}: ProductSearchBoxProps) {
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const { results, intent, isInterpreting } = useSmartProductSearch(products, value, showSuggestions);
  const visible = showSuggestions && focused && value.trim().length >= 2;
  const suggestions = results.slice(0, 6);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSubmit?.();
    navigate(`/catalog?search=${encodeURIComponent(value.trim())}`);
    setFocused(false);
  };

  const close = () => {
    setFocused(false);
    onNavigate?.();
  };

  return (
    <div className={cn('relative', className)} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
    }}>
      <form onSubmit={submit} role="search">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-storefront-search-muted" strokeWidth={1.5} />
        <Input
          type="search"
          aria-label="Pesquisar produtos"
          aria-expanded={visible}
          aria-controls="product-search-suggestions"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onFocus={() => setFocused(true)}
          onChange={(event) => onChange(event.target.value)}
          className={cn('h-12 w-full rounded-full border-storefront-header-border bg-storefront-search pl-12 pr-11 text-sm text-storefront-search-foreground placeholder:text-storefront-search-muted focus-visible:ring-accent', inputClassName)}
        />
        {isInterpreting && <Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Interpretando pesquisa" />}
      </form>

      {visible && (
        <div id="product-search-suggestions" className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pesquisa inteligente</span>
            {(intent.minPrice !== null || intent.maxPrice !== null) && (
              <span className="ml-auto">
                {intent.minPrice !== null && `A partir de ${currency.format(intent.minPrice)}`}
                {intent.minPrice !== null && intent.maxPrice !== null && ' · '}
                {intent.maxPrice !== null && `Até ${currency.format(intent.maxPrice)}`}
              </span>
            )}
          </div>
          {suggestions.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto py-1">
              {suggestions.map((product) => {
                const image = product.images?.[0];
                const available = product.variants?.some((variant) => variant.inventory_quantity > 0 || variant.inventory_policy === 'continue') ?? product.is_available;
                return (
                  <Link key={product.id} to={`/product/${product.handle}`} onClick={close} className="flex min-h-20 items-center gap-3 px-4 py-2 transition-colors hover:bg-muted focus:bg-muted focus:outline-none">
                    {image ? <img src={image.url} alt="" className="h-16 w-16 shrink-0 object-cover" /> : <div className="h-16 w-16 shrink-0 bg-muted" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{[product.vendor, product.product_type].filter(Boolean).join(' · ')}</p>
                      <p className="mt-1 text-sm">{currency.format(product.price)}</p>
                    </div>
                    <span className={cn('shrink-0 text-[10px] uppercase', available ? 'text-muted-foreground' : 'text-destructive')}>{available ? 'Disponível' : 'Esgotado'}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum produto real encontrado para esta pesquisa.</p>
          )}
          <div className="border-t border-border p-2">
            <Button type="button" variant="ghost" className="w-full justify-between" onClick={() => { submit({ preventDefault: () => undefined } as React.FormEvent); }}>
              Ver todos os resultados
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

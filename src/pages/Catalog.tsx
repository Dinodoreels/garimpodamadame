import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ProductGrid } from '@/components/products/ProductGrid';

import { useProducts } from '@/hooks/useProducts';
import { useCMSPageBySlugOrHome, type CMSSection } from '@/hooks/useCMS';
import { DynamicSection } from '@/components/cms/blocks/DynamicSection';
import { useCatalogShippingCep } from '@/hooks/useCatalogShippingCep';
import { CategoryChips } from '@/components/catalog/CategoryChips';
import { CatalogFiltersSheet, type CatalogFilters } from '@/components/catalog/CatalogFiltersSheet';
import { HeroBannerCarousel } from '@/components/home/HeroBannerCarousel';
import { useSmartProductSearch } from '@/hooks/useSmartProductSearch';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'expiry-asc';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getDaysToExpiry, getEarliestExpiry } from '@/lib/expiry';

const DAYS_NEW = 7;

function parseNumber(value: string): number | null {
  if (!value) return null;
  const n = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  );
  const [category, setCategory] = useState<string>(searchParams.get('category') || '');
  const [filters, setFilters] = useState<CatalogFilters>({
    vendor: searchParams.get('vendor') || '',
    minPrice: searchParams.get('min') || '',
    maxPrice: searchParams.get('max') || '',
    onlyPromo: searchParams.get('promo') === '1',
    onlyNew: searchParams.get('new') === '1',
    onlyAvailable: searchParams.get('avail') === '1',
  });

  const { data: products, isLoading } = useProducts();
  const { results: searchedProducts, isInterpreting } = useSmartProductSearch(products ?? [], searchQuery);
  const { data: cmsPage } = useCMSPageBySlugOrHome('catalog');
  const { cep: shippingCep } = useCatalogShippingCep();

  // Sync state to URL (replace, no history spam)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (category) params.set('category', category);
    if (filters.vendor) params.set('vendor', filters.vendor);
    if (filters.minPrice) params.set('min', filters.minPrice);
    if (filters.maxPrice) params.set('max', filters.maxPrice);
    if (filters.onlyPromo) params.set('promo', '1');
    if (filters.onlyNew) params.set('new', '1');
    if (filters.onlyAvailable) params.set('avail', '1');
    setSearchParams(params, { replace: true });
  }, [searchQuery, sortBy, category, filters, setSearchParams]);

  // Available vendors from products
  const vendors = useMemo(() => {
    if (!products) return [];
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.vendor) set.add(p.vendor);
    });
    return Array.from(set).sort();
  }, [products]);

  // Counts per category (after search but before category filter, so chips reflect search)
  const productCountsByCategory = useMemo(() => {
    if (!products) return {} as Record<string, number>;
    const acc: Record<string, number> = {};
    searchedProducts.forEach((p) => {
      const key = p.product_type || '';
      if (!key) return;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, [products, searchedProducts]);

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return [];

    const min = parseNumber(filters.minPrice);
    const max = parseNumber(filters.maxPrice);
    const now = Date.now();

    const filtered = searchedProducts.filter((p) => {
      if (category && p.product_type !== category) return false;
      if (filters.vendor && p.vendor !== filters.vendor) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (filters.onlyPromo) {
        if (!p.compare_at_price || p.compare_at_price <= p.price) return false;
      }
      if (filters.onlyNew) {
        const days = (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (days > DAYS_NEW) return false;
      }
      if (filters.onlyAvailable) {
        const has = p.variants?.some((v) => v.inventory_quantity > 0 || v.inventory_policy === 'continue');
        if (!has) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'expiry-asc': {
          const ea = getEarliestExpiry(a.expiry_date, a.variants);
          const eb = getEarliestExpiry(b.expiry_date, b.variants);
          const da = getDaysToExpiry(ea);
          const db = getDaysToExpiry(eb);
          if (da === null && db === null) return 0;
          if (da === null) return 1;
          if (db === null) return -1;
          return da - db;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [products, searchedProducts, sortBy, category, filters]);

  const activeFilterCount =
    (filters.vendor ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.onlyPromo ? 1 : 0) +
    (filters.onlyNew ? 1 : 0) +
    (filters.onlyAvailable ? 1 : 0);

  const cmsHeaderSections = cmsPage?.sections?.filter((s) =>
    ['hero', 'text', 'cta', 'features', 'image', 'video', 'spacer', 'divider'].includes(s.type)
  ) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <HeroBannerCarousel compact />

        {cmsHeaderSections.length > 0 ? (
          cmsHeaderSections.map((section) => (
            <DynamicSection key={section.id} section={section as CMSSection} />
          ))
        ) : (
          <section className="bg-secondary/50 py-8 lg:py-12">
            <div className="container">
              <h1 className="font-display text-3xl lg:text-4xl font-light tracking-wide">Catálogo</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Explore nossa coleção de produtos importados
              </p>
            </div>
          </section>
        )}

        <section className="py-6 border-b">
          <div className="container space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
                {isInterpreting && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Entendendo sua busca…</span>}
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[180px] h-12">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Mais Recentes</SelectItem>
                    <SelectItem value="price-asc">Menor Preço</SelectItem>
                    <SelectItem value="price-desc">Maior Preço</SelectItem>
                    <SelectItem value="name-asc">Nome A-Z</SelectItem>
                    <SelectItem value="name-desc">Nome Z-A</SelectItem>
                    <SelectItem value="expiry-asc">Validade mais próxima</SelectItem>
                  </SelectContent>
                </Select>

                <CatalogFiltersSheet
                  filters={filters}
                  onChange={setFilters}
                  vendors={vendors}
                  activeCount={activeFilterCount}
                />
              </div>
            </div>

            <CategoryChips
              productCounts={productCountsByCategory}
              selected={category}
              onSelect={setCategory}
            />

            <div className="flex items-center gap-2">
              <Switch
                id="only-available"
                checked={filters.onlyAvailable}
                onCheckedChange={(v) => setFilters({ ...filters, onlyAvailable: v })}
              />
              <Label htmlFor="only-available" className="text-sm cursor-pointer">
                Somente disponíveis
              </Label>
            </div>

            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedProducts.length}{' '}
                {filteredAndSortedProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </p>
            )}
          </div>
        </section>

        <section className="py-8 lg:py-12">
          <div className="container">
            <ProductGrid products={filteredAndSortedProducts} isLoading={isLoading} shippingCep={shippingCep} />
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

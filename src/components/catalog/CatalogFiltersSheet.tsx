import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface CatalogFilters {
  vendor: string;
  minPrice: string;
  maxPrice: string;
  onlyPromo: boolean;
  onlyNew: boolean;
  onlyAvailable: boolean;
}

interface CatalogFiltersSheetProps {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  vendors: string[];
  activeCount: number;
}

export function CatalogFiltersSheet({ filters, onChange, vendors, activeCount }: CatalogFiltersSheetProps) {
  const update = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const reset = () =>
    onChange({
      vendor: '',
      minPrice: '',
      maxPrice: '',
      onlyPromo: false,
      onlyNew: false,
      onlyAvailable: false,
    });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-12 gap-2 relative">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full p-0 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-light tracking-wide">Filtros</SheetTitle>
          <SheetDescription className="text-xs">
            Refine seus resultados
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Faixa de preço</Label>
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal"
                placeholder="R$ min"
                value={filters.minPrice}
                onChange={(e) => update('minPrice', e.target.value.replace(/[^\d.,]/g, ''))}
              />
              <span className="text-muted-foreground">—</span>
              <Input
                inputMode="decimal"
                placeholder="R$ max"
                value={filters.maxPrice}
                onChange={(e) => update('maxPrice', e.target.value.replace(/[^\d.,]/g, ''))}
              />
            </div>
          </div>

          {vendors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Marca</Label>
              <Select value={filters.vendor || '__all__'} onValueChange={(v) => update('vendor', v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as marcas</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="f-promo" className="font-light text-sm">Apenas em promoção</Label>
              <Switch id="f-promo" checked={filters.onlyPromo} onCheckedChange={(v) => update('onlyPromo', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="f-new" className="font-light text-sm">Apenas novidades (7 dias)</Label>
              <Switch id="f-new" checked={filters.onlyNew} onCheckedChange={(v) => update('onlyNew', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="f-avail" className="font-light text-sm">Apenas disponíveis</Label>
              <Switch id="f-avail" checked={filters.onlyAvailable} onCheckedChange={(v) => update('onlyAvailable', v)} />
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={reset} className="w-full">
            Limpar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

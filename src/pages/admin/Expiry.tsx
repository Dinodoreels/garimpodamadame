import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarIcon, Download, FileText, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useProductCategories } from '@/hooks/useProductCategories';
import {
  formatDateBR,
  getDaysToExpiry,
  getExpiryStatus,
} from '@/lib/expiry';
import { downloadExpiryCSV, downloadExpiryPDF, type ExpiryRow } from '@/lib/expiryReports';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type Tab = 'expired' | 'expiring' | 'all';

interface FlatRow {
  key: string;
  productId: string;
  variantId: string | null;
  productTitle: string;
  variantTitle: string | null;
  categoryValue: string | null;
  categoryLabel: string | null;
  stock: number;
  expiryDate: string | null;
  alertDays: number;
}

export default function Expiry() {
  const qc = useQueryClient();
  const { data: categories } = useProductCategories();
  const [tab, setTab] = useState<Tab>('expiring');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-expiry-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, product_type, expiry_date, variants:product_variants(id, title, inventory_quantity, expiry_date, volume_ml, option1, option2)')
        .eq('status', 'active')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  const updateExpiry = useMutation({
    mutationFn: async ({ productId, variantId, date }: { productId: string; variantId: string | null; date: string | null }) => {
      if (variantId) {
        const { error } = await supabase.from('product_variants').update({ expiry_date: date }).eq('id', variantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').update({ expiry_date: date }).eq('id', productId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-expiry-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Validade atualizada');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
  });

  const rows: FlatRow[] = useMemo(() => {
    if (!products) return [];
    const out: FlatRow[] = [];
    products.forEach((p: any) => {
      const cat = categories?.find((c) => c.value === p.product_type);
      const alertDays = cat?.expiry_alert_days ?? 60;
      const variants = p.variants || [];
      if (variants.length === 0) {
        out.push({
          key: p.id,
          productId: p.id,
          variantId: null,
          productTitle: p.title,
          variantTitle: null,
          categoryValue: p.product_type,
          categoryLabel: cat?.label ?? p.product_type,
          stock: 0,
          expiryDate: p.expiry_date,
          alertDays,
        });
      } else {
        variants.forEach((v: any) => {
          const exp = v.expiry_date || p.expiry_date;
          out.push({
            key: `${p.id}-${v.id}`,
            productId: p.id,
            variantId: v.id,
            productTitle: p.title,
            variantTitle: v.title || [v.option1, v.option2].filter(Boolean).join(' / ') || null,
            categoryValue: p.product_type,
            categoryLabel: cat?.label ?? p.product_type,
            stock: v.inventory_quantity ?? 0,
            expiryDate: exp,
            alertDays,
          });
        });
      }
    });
    return out;
  }, [products, categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter !== 'all' && r.categoryValue !== categoryFilter) return false;
      if (q && !r.productTitle.toLowerCase().includes(q)) return false;
      const status = getExpiryStatus(r.expiryDate, r.alertDays);
      if (tab === 'expired') return status === 'expired';
      if (tab === 'expiring') return status === 'expiring';
      return r.expiryDate !== null;
    });
  }, [rows, tab, search, categoryFilter]);

  const counts = useMemo(() => {
    let expired = 0;
    let expiring = 0;
    let all = 0;
    rows.forEach((r) => {
      const s = getExpiryStatus(r.expiryDate, r.alertDays);
      if (r.expiryDate) all++;
      if (s === 'expired') expired++;
      if (s === 'expiring') expiring++;
    });
    return { expired, expiring, all };
  }, [rows]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = getDaysToExpiry(a.expiryDate);
        const db = getDaysToExpiry(b.expiryDate);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }),
    [filtered]
  );

  const exportRows: ExpiryRow[] = sorted.map((r) => ({
    productTitle: r.productTitle,
    variantTitle: r.variantTitle,
    category: r.categoryLabel,
    stock: r.stock,
    expiryDate: r.expiryDate,
    alertDays: r.alertDays,
  }));

  const handleRenew = (r: FlatRow, days: number) => {
    const base = r.expiryDate && getDaysToExpiry(r.expiryDate)! > 0 ? new Date(r.expiryDate) : new Date();
    base.setDate(base.getDate() + days);
    const iso = base.toISOString().slice(0, 10);
    updateExpiry.mutate({ productId: r.productId, variantId: r.variantId, date: iso });
  };

  const handlePickDate = (r: FlatRow, date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, 'yyyy-MM-dd');
    updateExpiry.mutate({ productId: r.productId, variantId: r.variantId, date: iso });
  };

  return (
    <div className="container py-6 max-w-[1400px]">
      <AdminPageHeader
        title="Validade de Produtos"
        subtitle="Acompanhe produtos vencidos e próximos do vencimento"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadExpiryCSV(exportRows)}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExpiryPDF(exportRows)}>
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Vencidos</p>
          <p className="text-2xl font-light text-destructive">{counts.expired}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Vencendo em breve</p>
          <p className="text-2xl font-light text-orange-500">{counts.expiring}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total com validade</p>
          <p className="text-2xl font-light">{counts.all}</p>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-shrink-0">
          <TabsList>
            <TabsTrigger value="expired">Vencidos ({counts.expired})</TabsTrigger>
            <TabsTrigger value="expiring">Vencendo ({counts.expiring})</TabsTrigger>
            <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => {
                const days = getDaysToExpiry(r.expiryDate);
                const status = getExpiryStatus(r.expiryDate, r.alertDays);
                return (
                  <TableRow key={r.key}>
                    <TableCell className="font-medium">{r.productTitle}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.variantTitle ?? '—'}</TableCell>
                    <TableCell className="text-sm">{r.categoryLabel ?? '—'}</TableCell>
                    <TableCell className="text-right">{r.stock}</TableCell>
                    <TableCell>{formatDateBR(r.expiryDate)}</TableCell>
                    <TableCell>
                      {status === 'expired' && <Badge variant="destructive">VENCIDO</Badge>}
                      {status === 'expiring' && (
                        <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                          {days === 0 ? 'Vence hoje' : `${days}d`}
                        </Badge>
                      )}
                      {status === 'ok' && <Badge variant="secondary">OK</Badge>}
                      {status === 'none' && <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleRenew(r, 30)}>+30d</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRenew(r, 60)}>+60d</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRenew(r, 90)}>+90d</Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="outline">
                              <CalendarIcon className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={r.expiryDate ? new Date(r.expiryDate) : undefined}
                              onSelect={(d) => handlePickDate(r, d)}
                              className={cn('p-3 pointer-events-auto')}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
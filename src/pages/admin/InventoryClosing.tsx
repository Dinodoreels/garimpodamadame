import { useState, useMemo } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, Package, DollarSign, TrendingUp, Lock, Unlock, AlertTriangle, CheckCircle2, Store as StoreIcon, Search, ArrowUpDown, Printer, Percent, Info } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CompactStatsCard } from '@/components/admin/CompactStatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useInventoryClosingMonth, useReopenInventoryMonth } from '@/hooks/useInventoryClosing';
import { useStores } from '@/hooks/useStores';
import { InventoryClosingDialog } from '@/components/admin/InventoryClosingDialog';
import { cn } from '@/lib/utils';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type SortKey = 'product' | 'current' | 'divergence' | 'totalCost';

export default function InventoryClosing() {
  const [date, setDate] = useState(new Date());
  const [storeId, setStoreId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyDivergent, setOnlyDivergent] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('divergence');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthLabel = format(date, "MMMM 'de' yyyy", { locale: ptBR });

  const { data: stores } = useStores();
  const { data, isLoading } = useInventoryClosingMonth(year, month, storeId);
  const reopen = useReopenInventoryMonth();

  const navigate = (dir: -1 | 1) => {
    setDate(prev => dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const isClosed = !!data?.closing;
  const hasBaseline = !!data?.hasBaseline;

  const variation = useMemo(() => {
    if (!data?.previous) return null;
    return {
      units: data.totals.units - Number(data.previous.total_units || 0),
      cost: data.totals.cost_value - Number(data.previous.total_cost_value || 0),
      retail: data.totals.retail_value - Number(data.previous.total_retail_value || 0),
    };
  }, [data]);

  const margin = useMemo(() => {
    if (!data || data.totals.retail_value === 0) return 0;
    return ((data.totals.retail_value - data.totals.cost_value) / data.totals.retail_value) * 100;
  }, [data]);

  const divergenceStats = useMemo(() => {
    if (!data) return { count: 0, lostValue: 0 };
    if (!data.hasBaseline) return { count: 0, lostValue: 0 };
    let count = 0;
    let lostValue = 0;
    data.rows.forEach(r => {
      if (r.divergence !== 0) count++;
      if (r.divergence > 0) lostValue += r.divergence * r.unit_cost;
    });
    return { count, lostValue };
  }, [data]);

  const filteredSortedRows = useMemo(() => {
    if (!data) return [];
    let rows = data.rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        r.product_title.toLowerCase().includes(q) ||
        (r.variant_title || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q)
      );
    }
    if (onlyDivergent && hasBaseline) rows = rows.filter(r => r.divergence !== 0);
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'product': return a.product_title.localeCompare(b.product_title) * dir;
        case 'current': return (a.current - b.current) * dir;
        case 'divergence': return (Math.abs(a.divergence) - Math.abs(b.divergence)) * dir;
        case 'totalCost': return ((a.current * a.unit_cost) - (b.current * b.unit_cost)) * dir;
      }
    });
    return rows;
  }, [data, search, onlyDivergent, sortKey, sortDir, hasBaseline]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ label, k, align = 'left' }: { label: string; k: SortKey; align?: 'left' | 'right' }) => (
    <TableHead className={cn(align === 'right' && 'text-right', 'cursor-pointer select-none')} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === k ? 'opacity-100' : 'opacity-30')} />
      </span>
    </TableHead>
  );

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Produto', 'Variante', 'SKU', 'Inicial', 'Vendas', 'Atual', 'Divergência', 'Custo Unit.', 'Preço Unit.', 'Total Custo', 'Total Venda']];
    data.rows.forEach(r => {
      rows.push([
        r.product_title,
        r.variant_title || '',
        r.sku || '',
        hasBaseline ? String(r.initial) : '',
        String(r.sold),
        String(r.current),
        hasBaseline ? String(r.divergence) : '',
        r.unit_cost.toFixed(2),
        r.unit_price.toFixed(2),
        (r.current * r.unit_cost).toFixed(2),
        (r.current * r.unit_price).toFixed(2),
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento-estoque-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReopen = async () => {
    if (!data?.closing) return;
    if (!confirm('Tem certeza que deseja reabrir este mês? O snapshot será removido permanentemente.')) return;
    await reopen.mutateAsync(data.closing.id);
  };

  return (
    <div className="space-y-6 print:space-y-3">
      <AdminPageHeader
        title="Fechamento de Estoque"
        subtitle="Snapshot mensal e controle de divergências"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Fechamento de Estoque' }]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.rows.length}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            {isClosed ? (
              <Button variant="outline" size="sm" onClick={handleReopen} disabled={reopen.isPending}>
                <Unlock className="h-4 w-4 mr-2" /> Reabrir Mês
              </Button>
            ) : (
              <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={isLoading || !data?.rows.length}>
                <Lock className="h-4 w-4 mr-2" /> Fechar Estoque do Mês
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {stores && stores.length > 0 && (
          <Select value={storeId || 'all'} onValueChange={v => setStoreId(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[200px] h-8">
              <StoreIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Geral" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Geral (todas)</SelectItem>
              {stores.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        {isClosed ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            Fechado em {format(new Date(data!.closing!.closed_at), "dd/MM/yyyy 'às' HH:mm")}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Mês em aberto
          </Badge>
        )}
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-medium">Fechamento de Estoque — {monthLabel}</h1>
        <p className="text-sm text-muted-foreground">Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <CompactStatsCard title="Unidades" value={data.totals.units} icon={Package} />
            <CompactStatsCard title="Valor (Custo)" value={formatCurrency(data.totals.cost_value)} icon={DollarSign} />
            <CompactStatsCard title="Valor (Venda)" value={formatCurrency(data.totals.retail_value)} icon={TrendingUp} />
            <CompactStatsCard title="Margem Potencial" value={`${margin.toFixed(1)}%`} icon={Percent} />
            <CompactStatsCard
              title="Variação Custo (mês ant.)"
              value={variation ? `${variation.cost >= 0 ? '+' : ''}${formatCurrency(variation.cost)}` : '—'}
              icon={TrendingUp}
            />
            <CompactStatsCard
              title="Divergências"
              value={hasBaseline ? `${divergenceStats.count} | ${formatCurrency(divergenceStats.lostValue)}` : '—'}
              icon={AlertTriangle}
            />
          </div>

          {!hasBaseline && !isClosed && (
            <div className="flex items-start gap-3 p-4 border border-yellow-500/30 bg-yellow-500/10 rounded print:hidden">
              <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm">
                  <strong>Não há fechamento do mês anterior.</strong> Por isso, a coluna <em>Divergência</em> não pode ser calculada agora —
                  ela aparecerá como <span className="font-mono">—</span> e o status como <span className="font-mono">Sem base</span>.
                  Feche o estoque deste mês para criar o <strong>baseline</strong>; a partir do próximo mês, as divergências reais passarão a ser calculadas automaticamente.
                </p>
                <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={isLoading || !data?.rows.length}>
                  <Lock className="h-4 w-4 mr-2" /> Fechar Estoque do Mês
                </Button>
              </div>
            </div>
          )}

          {variation && (
            <p className="text-xs text-muted-foreground -mt-2 print:hidden">
              Mês anterior: {data.previous?.total_units || 0} un · {formatCurrency(Number(data.previous?.total_cost_value || 0))} (custo) ·{' '}
              {formatCurrency(Number(data.previous?.total_retail_value || 0))} (venda) — variação: {variation.units >= 0 ? '+' : ''}{variation.units} un
            </p>
          )}

          {data.closing?.notes && (
            <div className="bg-muted p-3 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Observações</p>
              <p>{data.closing?.notes}</p>
            </div>
          )}

          {data.rows.length > 0 ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Detalhamento por Variante ({filteredSortedRows.length})
                </h2>
                <div className="flex flex-wrap items-center gap-3 print:hidden">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto/SKU..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-8 w-56"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="only-div" checked={onlyDivergent} onCheckedChange={setOnlyDivergent} disabled={!hasBaseline} />
                    <Label htmlFor="only-div" className={cn("text-xs cursor-pointer", !hasBaseline && "opacity-50 cursor-not-allowed")}>Só divergências</Label>
                  </div>
                </div>
              </div>
              <div className="border border-border rounded overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Produto" k="product" />
                      <TableHead>Variante</TableHead>
                      <TableHead className="text-right">Inicial</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <SortHeader label="Atual" k="current" align="right" />
                      <SortHeader label="Divergência" k="divergence" align="right" />
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <SortHeader label="Total Custo" k="totalCost" align="right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSortedRows.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum item corresponde aos filtros.</TableCell></TableRow>
                    ) : filteredSortedRows.map(r => {
                      const absDiv = Math.abs(r.divergence);
                      const status = !hasBaseline ? 'nobase' : r.divergence === 0 ? 'ok' : absDiv > 5 ? 'critical' : 'warn';
                      return (
                        <TableRow key={r.variant_id}>
                          <TableCell className="font-medium">{r.product_title}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {r.variant_title}
                            {r.sku && <span className="ml-2 text-xs">({r.sku})</span>}
                          </TableCell>
                          <TableCell className="text-right">{hasBaseline ? r.initial : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-right">{r.sold}</TableCell>
                          <TableCell className="text-right">{r.current}</TableCell>
                          <TableCell className={cn(
                            "text-right font-medium",
                            hasBaseline && r.divergence > 0 && "text-destructive",
                            hasBaseline && r.divergence < 0 && "text-green-600 dark:text-green-400",
                          )}>
                            {!hasBaseline ? <span className="text-muted-foreground font-normal">—</span> : (r.divergence > 0 ? `+${r.divergence}` : r.divergence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {status === 'nobase' && <Badge variant="outline" className="text-[10px] text-muted-foreground">Sem base</Badge>}
                            {status === 'ok' && <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">OK</Badge>}
                            {status === 'warn' && <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">Divergência</Badge>}
                            {status === 'critical' && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">Crítico</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(r.unit_cost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.current * r.unit_cost)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Divergência</strong> = Inicial − Vendas − Atual. Positivo (vermelho) indica perda/ajuste não registrado; negativo indica entrada não registrada.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum produto encontrado.</p>
            </div>
          )}
        </>
      ) : null}

      {data && (
        <InventoryClosingDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          year={year}
          month={month}
          storeId={storeId}
          totals={data.totals}
          monthLabel={monthLabel}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { format, subDays, addDays, subWeeks, addWeeks, subMonths, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, DollarSign, ShoppingBag, Receipt, Package, Store as StoreIcon, Globe, MessageCircle, User, Printer, Users, TrendingUp, CalendarRange, CreditCard, Trophy, AlertCircle, RefreshCcw } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { useClosingReport, PeriodType, PAYMENT_LABELS } from '@/hooks/useClosingReport';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { PeriodComparisonCard } from '@/components/admin/closing/PeriodComparisonCard';
import { DateRange } from 'react-day-picker';

const SOURCE_COLORS: Record<string, string> = {
  website: 'hsl(220, 70%, 55%)',
  whatsapp: 'hsl(142, 60%, 45%)',
  store: 'hsl(30, 80%, 55%)',
  manual: 'hsl(0, 0%, 55%)',
};

const SOURCE_ICONS: Record<string, any> = {
  website: Globe,
  whatsapp: MessageCircle,
  store: StoreIcon,
  manual: ShoppingBag,
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site',
  whatsapp: 'WhatsApp',
  store: 'Loja Física',
  manual: 'Manual',
};

const PAYMENT_COLORS = ['hsl(220, 70%, 55%)', 'hsl(142, 60%, 45%)', 'hsl(30, 80%, 55%)', 'hsl(280, 60%, 55%)', 'hsl(0, 0%, 55%)', 'hsl(190, 70%, 50%)'];

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Closing() {
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [date, setDate] = useState(new Date());
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const customRangeReady = period === 'custom' && customRange?.from && customRange?.to;
  const { data, isLoading, isError, error, refetch, isFetching } = useClosingReport({
    period,
    date,
    sellerId: selectedSeller || undefined,
    storeId: selectedStore || undefined,
    customRange: customRangeReady ? { start: customRange!.from!, end: customRange!.to! } : undefined,
  });

  const navigate = (dir: -1 | 1) => {
    if (period === 'custom') return;
    setDate(prev => {
      if (period === 'daily') return dir === -1 ? subDays(prev, 1) : addDays(prev, 1);
      if (period === 'weekly') return dir === -1 ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1);
    });
  };

  const periodLabel = () => {
    if (period === 'daily') return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
    if (period === 'weekly') {
      const s = startOfWeek(date, { locale: ptBR });
      const e = endOfWeek(date, { locale: ptBR });
      return `${format(s, 'dd/MM')} — ${format(e, 'dd/MM/yyyy')}`;
    }
    if (period === 'custom') {
      if (customRange?.from && customRange?.to) {
        return `${format(customRange.from, 'dd/MM/yy')} — ${format(customRange.to, 'dd/MM/yy')}`;
      }
      return 'Selecione o período';
    }
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Produto', 'Preço Unit.', 'Qtd', 'Total', 'Canal', 'Vendedor']];
    data.productDetails.forEach(p => {
      rows.push([p.productTitle, p.unitPrice.toFixed(2), String(p.quantity), p.total.toFixed(2), SOURCE_LABELS[p.source] || p.source, p.sellerName || '-']);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento-${period}-${format(date, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSummaryCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Resumo do Período', periodLabel()],
      [],
      ['Métrica', 'Valor'],
      ['Receita Total', data.summary.revenue.toFixed(2)],
      ['Lucro Bruto', data.summary.grossProfit.toFixed(2)],
      ['Margem (%)', data.summary.margin.toFixed(2)],
      ['Pedidos', String(data.summary.ordersCount)],
      ['Ticket Médio', data.summary.averageTicket.toFixed(2)],
      ['Unidades Vendidas', String(data.summary.unitsSold)],
      [],
      ['Por Canal'],
      ['Canal', 'Pedidos', 'Receita'],
      ...data.bySource.map(s => [s.label, String(s.orders), s.revenue.toFixed(2)]),
      [],
      ['Por Forma de Pagamento'],
      ['Forma', 'Pedidos', 'Receita'],
      ...data.byPaymentMethod.map(p => [p.label, String(p.orders), p.revenue.toFixed(2)]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento-resumo-${format(date, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 print:space-y-3">
      <AdminPageHeader
        title="Fechamento de Caixa"
        subtitle="Relatório detalhado por período"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Fechamento' }]}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportSummaryCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-2" /> Resumo
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.productDetails.length}>
              <Download className="h-4 w-4 mr-2" /> Produtos
            </Button>
          </div>
        }
      />

      {/* Period tabs + date nav */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 print:hidden">
        <Tabs value={period} onValueChange={v => { setPeriod(v as PeriodType); if (v !== 'custom') setDate(new Date()); setSelectedSeller(null); setSelectedStore(null); }}>
          <TabsList>
            <TabsTrigger value="daily">Diário</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
          </TabsList>
        </Tabs>
        {period !== 'custom' ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center capitalize">{periodLabel()}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <CalendarRange className="h-4 w-4" />
                <span>{periodLabel()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={customRange} onSelect={setCustomRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        )}
        {data?.sellers && data.sellers.length > 0 && (
          <Select value={selectedSeller || 'all'} onValueChange={v => setSelectedSeller(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[200px] h-8">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todos os vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {data.sellers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {data?.storesList && data.storesList.length > 0 && (
          <Select value={selectedStore || 'all'} onValueChange={v => setSelectedStore(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[200px] h-8">
              <StoreIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todas as lojas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as lojas</SelectItem>
              {data.storesList.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-medium">Fechamento — {periodLabel()}</h1>
        <p className="text-sm text-muted-foreground">Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="print:hidden">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o fechamento</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error instanceof Error ? error.message : 'Ocorreu um erro ao buscar os dados do período.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : data ? (
        <>
          {/* Summary cards with period comparison */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <PeriodComparisonCard
              title="Receita"
              value={formatCurrency(data.summary.revenue)}
              currentValue={data.summary.revenue}
              previousValue={data.previousSummary?.revenue}
              icon={DollarSign}
            />
            <PeriodComparisonCard
              title="Lucro Bruto"
              value={formatCurrency(data.summary.grossProfit)}
              currentValue={data.summary.grossProfit}
              previousValue={data.previousSummary?.grossProfit}
              icon={TrendingUp}
            />
            <PeriodComparisonCard
              title="Margem"
              value={`${data.summary.margin.toFixed(1)}%`}
              currentValue={data.summary.margin}
              previousValue={data.previousSummary?.margin}
              icon={TrendingUp}
            />
            <PeriodComparisonCard
              title="Pedidos"
              value={data.summary.ordersCount}
              currentValue={data.summary.ordersCount}
              previousValue={data.previousSummary?.ordersCount}
              icon={ShoppingBag}
            />
            <PeriodComparisonCard
              title="Ticket Médio"
              value={formatCurrency(data.summary.averageTicket)}
              currentValue={data.summary.averageTicket}
              previousValue={data.previousSummary?.averageTicket}
              icon={Receipt}
            />
            <PeriodComparisonCard
              title="Unidades"
              value={data.summary.unitsSold}
              currentValue={data.summary.unitsSold}
              previousValue={data.previousSummary?.unitsSold}
              icon={Package}
            />
          </div>

          {/* By source */}
          {data.bySource.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumo por Canal</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.bySource.map(s => {
                  const Icon = SOURCE_ICONS[s.source] || Globe;
                  return (
                    <div key={s.source} className="bg-background border border-border p-4 flex items-center gap-3">
                      <div className="p-2 bg-muted rounded"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                      <div>
                        <p className="text-lg font-light">{formatCurrency(s.revenue)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label} · {s.orders} pedidos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Side-by-side: Revenue chart + Payment methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
            {data.bySource.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Receita por Canal</h2>
                <div className="bg-background border border-border p-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bySource.map(s => ({ name: s.label, receita: s.revenue, source: s.source }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Receita']} />
                      <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                        {data.bySource.map(s => (
                          <Cell key={s.source} fill={SOURCE_COLORS[s.source] || SOURCE_COLORS.manual} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {data.byPaymentMethod.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" /> Forma de Pagamento
                </h2>
                <div className="bg-background border border-border p-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.byPaymentMethod} dataKey="revenue" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {data.byPaymentMethod.map((_, i) => (
                          <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, _n, item: any) => [formatCurrency(v), item?.payload?.label]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                    {data.byPaymentMethod.map((p, i) => (
                      <div key={p.method} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm" style={{ background: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{p.label}</span>
                        <span className="ml-auto font-medium">{formatCurrency(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top products */}
          {data.topProducts.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5" /> Top 10 Produtos
              </h2>
              <div className="border border-border rounded overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.map((p, i) => (
                      <TableRow key={p.productId || i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.productTitle}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {data.productDetails.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Detalhamento por Produto</h2>
              <div className="border border-border rounded overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Vendedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.productDetails.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.productTitle}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.unitPrice)}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{SOURCE_LABELS[p.source] || p.source}</Badge>
                        </TableCell>
                        <TableCell>{p.sellerName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* By seller */}
          {data.bySeller.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumo por Vendedor</h2>
              <div className="border border-border rounded overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Total Vendido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bySeller.map(s => (
                      <TableRow key={s.sellerId}>
                        <TableCell className="font-medium flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{s.name}</TableCell>
                        <TableCell className="text-right">{s.orders}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Orders list */}
          {data.orders.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Pedidos do Período</h2>
              <div className="border border-border rounded overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.order_number}</TableCell>
                        <TableCell>{o.customerName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{SOURCE_LABELS[o.source] || o.source}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{o.paymentMethod ? (PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod) : '-'}</TableCell>
                        <TableCell>{o.sellerName || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(o.total)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(o.created_at), 'dd/MM HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {data.orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum pedido encontrado neste período.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

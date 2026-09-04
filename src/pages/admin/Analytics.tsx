import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import {
  Activity,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  Globe,
  Monitor,
  MousePointerClick,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { BrowsersChart } from '@/components/admin/analytics/BrowsersChart';
import { ConversionFunnel } from '@/components/admin/analytics/ConversionFunnel';
import { HourlyTrafficChart } from '@/components/admin/analytics/HourlyTrafficChart';
import { KpiCard } from '@/components/admin/analytics/KpiCard';
import { LiveVisitorsCard } from '@/components/admin/analytics/LiveVisitorsCard';
import { TopReferrersCard } from '@/components/admin/analytics/TopReferrersCard';
import { TopViewedProductsCard } from '@/components/admin/analytics/TopViewedProductsCard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportAnalyticsCSV } from '@/lib/analytics-export';
import { AnalyticsPeriod, useAnalytics } from '@/hooks/useAnalytics';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--border))',
  'hsl(var(--foreground) / 0.75)',
  'hsl(var(--foreground) / 0.55)',
];

function CommerceFunnelCards({
  data,
  loading,
}: {
  data?: { cartSessions: number; ordersCreated: number; ordersPaid: number };
  loading?: boolean;
}) {
  const items = [
    {
      label: 'Foram para o carrinho',
      help: 'Sessões que iniciaram o checkout',
      icon: ShoppingCart,
      value: data?.cartSessions ?? 0,
      rateOf: undefined as number | undefined,
      rateBase: undefined as string | undefined,
      accent: 'text-primary',
    },
    {
      label: 'Foram para o checkout',
      help: 'Pedidos criados (qualquer status)',
      icon: CreditCard,
      value: data?.ordersCreated ?? 0,
      rateOf: data && data.cartSessions > 0 ? (data.ordersCreated / data.cartSessions) * 100 : undefined,
      rateBase: 'do carrinho',
      accent: 'text-accent-foreground',
    },
    {
      label: 'Finalizaram a compra',
      help: 'Pedidos pagos no período',
      icon: CheckCircle2,
      value: data?.ordersPaid ?? 0,
      rateOf: data && data.ordersCreated > 0 ? (data.ordersPaid / data.ordersCreated) * 100 : undefined,
      rateBase: 'do checkout',
      accent: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-md bg-secondary ${item.accent}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                {loading ? (
                  <Skeleton className="mt-1 h-7 w-20" />
                ) : (
                  <p className="text-2xl font-semibold">{item.value.toLocaleString('pt-BR')}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {loading
                    ? item.help
                    : item.rateOf !== undefined
                      ? `${item.rateOf.toFixed(1)}% ${item.rateBase}`
                      : item.help}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TrafficSourcesCard({ data, loading }: { data?: Array<{ name: string; value: number; percent: number }>; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Origens de tráfego</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {data.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
            </PieChart>
          </ResponsiveContainer>
        )}
        {!loading && data && data.length > 0 && (
          <div className="mt-4 grid gap-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="whitespace-nowrap text-muted-foreground">{item.value} · {item.percent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DevicesCard({ data, loading }: { data?: Array<{ name: string; value: number; percent: number }>; loading?: boolean }) {
  const iconByName = {
    Mobile: Smartphone,
    Desktop: Monitor,
    Tablet: Activity,
    Outro: Globe,
  } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dispositivos</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Sem dados no período</div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => {
              const Icon = iconByName[item.name as keyof typeof iconByName] || Globe;
              return (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-secondary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{item.value} · {item.percent.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-sm bg-muted">
                      <div className="h-full rounded-sm bg-primary" style={{ width: `${Math.max(item.percent, 4)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyChartCard({ data, loading }: { data?: Array<{ date: string; views: number; sessions: number }>; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Visualizações por dia</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <Skeleton className="h-[320px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="views" name="Visualizações" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="sessions" name="Sessões" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TopPagesCard({ data, loading }: { data?: Array<{ path: string; views: number; exits: number; exitRate: number }>; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Páginas mais visitadas</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Sem dados no período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Página</th>
                  <th className="py-2 text-right font-medium">Views</th>
                  <th className="py-2 text-right font-medium">Saídas</th>
                  <th className="py-2 text-right font-medium">Taxa saída</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.path} className="border-b last:border-0">
                    <td className="max-w-[260px] truncate py-2">{item.path}</td>
                    <td className="py-2 text-right">{item.views}</td>
                    <td className="py-2 text-right">{item.exits}</td>
                    <td className="py-2 text-right font-medium">{item.exitRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignsCard({ data, loading }: { data?: Array<{ source: string; medium: string; campaign: string; sessions: number }>; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Campanhas UTM</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma campanha rastreada no período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Fonte</th>
                  <th className="py-2 text-left font-medium">Meio</th>
                  <th className="py-2 text-left font-medium">Campanha</th>
                  <th className="py-2 text-right font-medium">Sessões</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={`${item.campaign}-${index}`} className="border-b last:border-0">
                    <td className="py-2">{item.source}</td>
                    <td className="py-2">{item.medium}</td>
                    <td className="max-w-[220px] truncate py-2">{item.campaign}</td>
                    <td className="py-2 text-right font-medium">{item.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const [tab, setTab] = useState('overview');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const rangeReady = period !== 'custom' || Boolean(customRange?.from && customRange?.to);
  const { data, isLoading, refetchAll, isFetching } = useAnalytics(
    period,
    period === 'custom' && customRange?.from && customRange?.to
      ? { start: customRange.from, end: customRange.to }
      : undefined,
    rangeReady,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        subtitle="Tráfego, comportamento e leitura rápida de conversão da loja"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytics' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchAll()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => data && exportAnalyticsCSV(data)} disabled={!data}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {period === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, 'dd/MM/yy', { locale: ptBR })} — ${format(customRange.to, 'dd/MM/yy', { locale: ptBR })}`
                    : 'Selecionar período'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={customRange} onSelect={setCustomRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {data?.rangeLabel || (rangeReady ? 'Carregando período...' : 'Selecione um intervalo completo')}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Visitantes únicos" metric={data?.kpis.uniqueVisitors} icon={Users} loading={isLoading || !rangeReady} />
        <KpiCard title="Visualizações" metric={data?.kpis.pageViews} icon={Eye} loading={isLoading || !rangeReady} />
        <KpiCard title="Sessões" metric={data?.kpis.sessions} icon={Activity} loading={isLoading || !rangeReady} />
        <KpiCard title="Páginas / sessão" metric={data?.kpis.pagesPerSession} icon={MousePointerClick} loading={isLoading || !rangeReady} />
        <KpiCard title="Taxa de conversão" metric={data?.kpis.conversionRate} icon={Globe} loading={isLoading || !rangeReady} />
        <KpiCard title="Bounce rate" metric={data?.kpis.bounceRate} icon={Smartphone} loading={isLoading || !rangeReady} />
      </div>

      <CommerceFunnelCards data={data?.commerceFunnel} loading={isLoading || !rangeReady} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="traffic">Tráfego</TabsTrigger>
          <TabsTrigger value="content">Páginas e campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ConversionFunnel steps={data?.funnel} loading={isLoading || !rangeReady} />
            <LiveVisitorsCard value={data?.liveVisitors} loading={isLoading || !rangeReady} />
          </div>
          <DailyChartCard data={data?.daily} loading={isLoading || !rangeReady} />
          <TopViewedProductsCard data={data?.topProducts} loading={isLoading || !rangeReady} />
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <TrafficSourcesCard data={data?.trafficSources} loading={isLoading || !rangeReady} />
            <DevicesCard data={data?.devices} loading={isLoading || !rangeReady} />
            <TopReferrersCard data={data?.topReferrers} loading={isLoading || !rangeReady} />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BrowsersChart data={data?.browsers} loading={isLoading || !rangeReady} />
            <HourlyTrafficChart data={data?.hourlyTraffic} loading={isLoading || !rangeReady} />
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TopPagesCard data={data?.topPages} loading={isLoading || !rangeReady} />
            <CampaignsCard data={data?.campaigns} loading={isLoading || !rangeReady} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

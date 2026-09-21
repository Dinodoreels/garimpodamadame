import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, CalendarIcon, X, Globe, MessageCircle, Store, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OrdersTable } from '@/components/admin/OrdersTable';
import { ExportButton } from '@/components/admin/ExportButton';
import { LabelPrintCenter } from '@/components/admin/LabelPrintCenter';
import { useAdminData } from '@/hooks/useAdminData';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

const STATUS_CARDS = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'paid', label: 'Pagos' },
  { key: 'processing', label: 'Processando' },
  { key: 'shipped', label: 'Enviados' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'refunded', label: 'Reembolsados' },
  { key: 'cancelled', label: 'Cancelados' },
];

const SOURCE_CARDS = [
  { key: 'website', label: 'Site', icon: Globe },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'store', label: 'Loja Física', icon: Store },
  { key: 'vendedor', label: 'Vendedor', icon: User },
];

const PAGE_SIZE = 20;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? 'all';
  const operationFilter = searchParams.get('operation');
  const { orders, loading, ordersError, updateOrderStatus, refetch } = useAdminData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setStatusFilter(searchParams.get('status') ?? 'all');
    setCurrentPage(1);
  }, [searchParams]);

  const queueCounts = useMemo(() => {
    const counts = { separation: 0, awaiting_data: 0, awaiting_invoice: 0, label_ready: 0, posting: 0, transit: 0, reconciliation: 0 };
    orders.forEach(order => {
      const source = String(order.source ?? '').toLowerCase();
      const marketplace = source.startsWith('bling:') || source.includes('marketplace') || source.includes('tiktok') || source.includes('shopify');
      const actionable = Boolean(order.paid_at) && ['paid', 'processing'].includes(order.status);
      const shipmentStatus = String(order.melhor_envio_shipment?.status ?? '');
      const validationStatus = String(order.melhor_envio_shipment?.validation_status ?? '');
      if (actionable) counts.separation += 1;
      if (!marketplace && actionable && (validationStatus === 'awaiting_data' || shipmentStatus === 'awaiting_data')) counts.awaiting_data += 1;
      if (!marketplace && actionable && (validationStatus === 'awaiting_invoice' || shipmentStatus === 'awaiting_invoice')) counts.awaiting_invoice += 1;
      if ((marketplace && order.marketplace_shipping_label?.status === 'ready') || (!marketplace && Boolean(order.melhor_envio_shipment?.label_url))) counts.label_ready += 1;
      if (actionable && ((marketplace && order.marketplace_shipping_label?.printed_at) || (!marketplace && order.melhor_envio_shipment?.printed_at))) counts.posting += 1;
      if (order.status === 'shipped') counts.transit += 1;
      if (order.paid_at && !order.shipping_address_id) counts.reconciliation += 1;
    });
    return counts;
  }, [orders]);

  // Status counts from ALL orders
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Source stats
  const sourceStats = useMemo(() => {
    const stats: Record<string, { count: number; revenue: number }> = {
      website: { count: 0, revenue: 0 },
      whatsapp: { count: 0, revenue: 0 },
      store: { count: 0, revenue: 0 },
      vendedor: { count: 0, revenue: 0 },
    };
    orders.forEach((o) => {
      const src = o.source || 'website';
      if (stats[src]) {
        stats[src].count++;
        stats[src].revenue += o.total;
      }
      if (o.created_by) {
        stats.vendedor.count++;
        stats.vendedor.revenue += o.total;
      }
    });
    return stats;
  }, [orders]);

  // Unique vendors list
  const vendors = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.created_by && o.created_by_name) {
        map.set(o.created_by, o.created_by_name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(search.toLowerCase()) ||
        order.profile?.full_name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      let matchesSource = true;
      if (sourceFilter === 'vendedor') {
        matchesSource = !!order.created_by;
      } else if (sourceFilter !== 'all') {
        matchesSource = (order.source || 'website') === sourceFilter;
      }

      const matchesVendor = vendorFilter === 'all' || order.created_by === vendorFilter;
      const paymentState = order.paid_at ? 'paid' : order.status === 'payment_failed' ? 'failed' : 'pending';
      const matchesPayment = paymentFilter === 'all' || paymentState === paymentFilter || order.payment_method === paymentFilter;
      const marketplaceLabel = order.marketplace_shipping_label;
      const shipment = order.melhor_envio_shipment;
      const currentLabelState = marketplaceLabel?.printed_at || shipment?.printed_at
        ? 'printed'
        : marketplaceLabel?.status === 'ready' || shipment?.label_url
          ? 'ready'
          : marketplaceLabel?.status === 'error'
            ? 'error'
            : 'pending';
      const matchesLabel = labelFilter === 'all' || currentLabelState === labelFilter;
      const source = String(order.source ?? '').toLowerCase();
      const isMarketplace = source.startsWith('bling:') || source.includes('marketplace') || source.includes('tiktok') || source.includes('shopify');
      const isActionable = Boolean(order.paid_at) && ['paid', 'processing'].includes(order.status);
      const matchesOperation = !operationFilter
        || (operationFilter === 'separation' && isActionable)
        || (operationFilter === 'shipping' && isActionable && (isMarketplace ? currentLabelState === 'pending' || currentLabelState === 'error' : !order.melhor_envio_shipment))
        || (operationFilter === 'awaiting_data' && !isMarketplace && isActionable && ['awaiting_data'].includes(String(order.melhor_envio_shipment?.validation_status ?? order.melhor_envio_shipment?.status ?? '')))
        || (operationFilter === 'awaiting_invoice' && !isMarketplace && isActionable && ['awaiting_invoice'].includes(String(order.melhor_envio_shipment?.validation_status ?? order.melhor_envio_shipment?.status ?? '')))
        || (operationFilter === 'label_ready' && (isMarketplace ? currentLabelState === 'ready' : Boolean(order.melhor_envio_shipment?.label_url)))
        || (operationFilter === 'posting' && isActionable && (isMarketplace ? Boolean(order.marketplace_shipping_label?.printed_at) : Boolean(order.melhor_envio_shipment?.printed_at)))
        || (operationFilter === 'transit' && order.status === 'shipped')
        || (operationFilter === 'reconciliation' && Boolean(order.paid_at) && !order.shipping_address_id)
        || (operationFilter === 'after-sales' && ['delivered', 'refunded'].includes(order.status));

      const orderDate = new Date(order.created_at);
      const matchesDateFrom = !dateFrom || orderDate >= new Date(dateFrom.setHours(0, 0, 0, 0));
      const matchesDateTo = !dateTo || orderDate <= new Date(new Date(dateTo).setHours(23, 59, 59, 999));

      return matchesSearch && matchesStatus && matchesSource && matchesVendor && matchesPayment && matchesLabel && matchesOperation && matchesDateFrom && matchesDateTo;
    });
  }, [orders, search, statusFilter, sourceFilter, vendorFilter, paymentFilter, labelFilter, operationFilter, dateFrom, dateTo]);

  const handleFilterChange = () => setCurrentPage(1);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSourceFilter('all');
    setVendorFilter('all');
    setPaymentFilter('all');
    setLabelFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || sourceFilter !== 'all' || vendorFilter !== 'all' || paymentFilter !== 'all' || labelFilter !== 'all' || dateFrom || dateTo;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide">Pedidos, cobranças e etiquetas</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            Acompanhe a venda, o pagamento e a postagem em um só lugar
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <LabelPrintCenter orders={filteredOrders} />
          <ExportButton orders={filteredOrders} />
          <Button onClick={() => navigate('/admin/orders/new')} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      </div>
      {ordersError && (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="flex-1 text-sm">{ordersError}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      )}
      {operationFilter && <div className="flex items-center justify-between gap-3 border-l-2 border-primary bg-muted/30 px-3 py-2 text-sm"><span>{operationFilter === 'separation' ? 'Pedidos pagos aguardando separação' : operationFilter === 'shipping' ? 'Fiscal, etiqueta e envio' : operationFilter === 'reconciliation' ? 'Pedidos antigos sem endereço vinculado' : 'Fila operacional selecionada'}</span><Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>Limpar fila</Button></div>}

      <section className="overflow-hidden rounded-md border bg-card" aria-label="Etapas operacionais">
        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 xl:grid-cols-7 xl:divide-y-0">
        {[
          ['separation', 'Separar'], ['awaiting_data', 'Aguardando dados'], ['awaiting_invoice', 'Aguardando nota'], ['label_ready', 'Etiqueta pronta'], ['posting', 'Postar'], ['transit', 'Em trânsito'], ['reconciliation', 'Conciliação'],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant="ghost"
            className={cn(
              'h-16 rounded-none px-4 transition-colors hover:bg-muted/50',
              operationFilter === key && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
            )}
            onClick={() => navigate(operationFilter === key ? '/admin/orders' : `/admin/orders?operation=${key}`)}
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="text-left text-xs font-medium">{label}</span>
              <span className="text-xl font-semibold tabular-nums">{queueCounts[key as keyof typeof queueCounts]}</span>
            </span>
          </Button>
        ))}
        </div>
      </section>

      {/* Source Summary Cards */}
      <section className="grid grid-cols-2 overflow-hidden rounded-md border bg-card md:grid-cols-4" aria-label="Pedidos por origem">
        {SOURCE_CARDS.map((sc) => {
          const stat = sourceStats[sc.key];
          const Icon = sc.icon;
          const isActive = sourceFilter === sc.key;
          return (
            <Button
              variant="ghost"
              key={sc.key}
              onClick={() => {
                setSourceFilter(isActive ? 'all' : sc.key);
                handleFilterChange();
              }}
              className={cn(
                'h-auto min-h-20 rounded-none border-b border-r p-4 text-left transition-colors hover:bg-muted/40 md:border-b-0',
                isActive && 'bg-muted ring-1 ring-inset ring-primary'
              )}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">{sc.label}</span>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{stat?.count || 0}</p>
                  <p className="text-[11px] font-normal text-muted-foreground">{formatCurrency(stat?.revenue || 0)}</p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
            </Button>
          );
        })}
      </section>

      {/* Status Cards */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar por situação">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-8 rounded-full px-4"
          onClick={() => { setStatusFilter('all'); handleFilterChange(); }}
        >
          Todos <span className="ml-1.5 tabular-nums">{orders.length}</span>
        </Button>
        {STATUS_CARDS.map((sc) => (
          <Button
            key={sc.key}
            variant={statusFilter === sc.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter(statusFilter === sc.key ? 'all' : sc.key);
              handleFilterChange();
            }}
            className="h-8 rounded-full px-4 font-normal"
          >
            {sc.label} <span className="ml-1.5 tabular-nums">{statusCounts[sc.key] || 0}</span>
          </Button>
        ))}
      </div>

      {/* Filters */}
      <section className="rounded-md border bg-card p-3" aria-label="Filtros de pedidos">
       <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-12">
        <div className="relative md:col-span-2 xl:col-span-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="pl-10 font-light"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleFilterChange(); }}>
          <SelectTrigger className="w-full font-light xl:col-span-2">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="payment_failed">Pagamento Falhou</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); handleFilterChange(); }}>
          <SelectTrigger className="w-full font-light xl:col-span-2">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="website">Site</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="store">Loja Física</SelectItem>
            <SelectItem value="vendedor">Vendedor</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); handleFilterChange(); }}>
          <SelectTrigger className="w-full font-light xl:col-span-2"><SelectValue placeholder="Cobrança" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cobranças</SelectItem>
            <SelectItem value="paid">Confirmadas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="failed">Com falha</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="credit_card">Crédito</SelectItem>
            <SelectItem value="debit_card">Débito</SelectItem>
          </SelectContent>
        </Select>

        <Select value={labelFilter} onValueChange={(v) => { setLabelFilter(v); handleFilterChange(); }}>
          <SelectTrigger className="w-full font-light xl:col-span-2"><SelectValue placeholder="Etiqueta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etiquetas</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="ready">Prontas</SelectItem>
            <SelectItem value="printed">Impressas</SelectItem>
            <SelectItem value="error">Com erro</SelectItem>
          </SelectContent>
        </Select>

        {vendors.length > 0 && (
          <Select value={vendorFilter} onValueChange={(v) => { setVendorFilter(v); handleFilterChange(); }}>
            <SelectTrigger className="w-full font-light xl:col-span-2">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left font-light', !dateFrom && 'text-muted-foreground')}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); handleFilterChange(); }} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left font-light', !dateTo && 'text-muted-foreground')}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); handleFilterChange(); }} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="justify-self-start xl:justify-self-end" title="Limpar filtros">
            <X className="mr-2 h-4 w-4" /> Limpar
          </Button>
        )}
       </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Pedidos</h2>
          <p className="text-xs text-muted-foreground">{filteredOrders.length} {filteredOrders.length === 1 ? 'resultado' : 'resultados'} nos filtros atuais</p>
        </div>
        {hasActiveFilters && <span className="text-xs text-muted-foreground">Filtros ativos</span>}
      </div>

      {/* Orders Table */}
      <OrdersTable orders={paginatedOrders} onStatusChange={updateOrderStatus} />

      {/* Pagination + Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground font-light">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'} encontrado{filteredOrders.length !== 1 ? 's' : ''}
          {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
        </p>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        isActive={currentPage === item}
                        onClick={() => setCurrentPage(item as number)}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}

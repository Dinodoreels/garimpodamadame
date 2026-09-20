import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, CalendarIcon, X, Globe, MessageCircle, Store, User } from 'lucide-react';
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
  { key: 'pending', label: 'Pendentes', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { key: 'paid', label: 'Pagos', color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'processing', label: 'Processando', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'shipped', label: 'Enviados', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'delivered', label: 'Entregues', color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'refunded', label: 'Reembolsados', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'cancelled', label: 'Cancelados', color: 'bg-red-100 text-red-800 border-red-200' },
];

const SOURCE_CARDS = [
  { key: 'website', label: 'Site', icon: Globe, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'store', label: 'Loja Física', icon: Store, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'vendedor', label: 'Vendedor', icon: User, color: 'bg-violet-50 text-violet-700 border-violet-200' },
];

const PAGE_SIZE = 20;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Orders() {
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus } = useAdminData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

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

      const orderDate = new Date(order.created_at);
      const matchesDateFrom = !dateFrom || orderDate >= new Date(dateFrom.setHours(0, 0, 0, 0));
      const matchesDateTo = !dateTo || orderDate <= new Date(new Date(dateTo).setHours(23, 59, 59, 999));

      return matchesSearch && matchesStatus && matchesSource && matchesVendor && matchesPayment && matchesLabel && matchesDateFrom && matchesDateTo;
    });
  }, [orders, search, statusFilter, sourceFilter, vendorFilter, paymentFilter, labelFilter, dateFrom, dateTo]);

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
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide">Pedidos, cobranças e etiquetas</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            Acompanhe a venda, o pagamento e a postagem em um só lugar
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <LabelPrintCenter orders={filteredOrders} />
          <ExportButton orders={filteredOrders} />
          <Button onClick={() => navigate('/admin/orders/new')} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* Source Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SOURCE_CARDS.map((sc) => {
          const stat = sourceStats[sc.key];
          const Icon = sc.icon;
          const isActive = sourceFilter === sc.key;
          return (
            <button
              key={sc.key}
              onClick={() => {
                setSourceFilter(isActive ? 'all' : sc.key);
                handleFilterChange();
              }}
              className={cn(
                'rounded-lg border p-3 text-left transition-all hover:shadow-sm',
                isActive
                  ? cn(sc.color, 'ring-2 ring-offset-1 ring-primary/30')
                  : 'bg-card border-border'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-xs font-medium">{sc.label}</span>
              </div>
              <p className="text-lg font-semibold">{stat?.count || 0}</p>
              <p className="text-[10px] text-muted-foreground font-light">
                {formatCurrency(stat?.revenue || 0)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {STATUS_CARDS.map((sc) => (
           <button
            key={sc.key}
            onClick={() => {
              setStatusFilter(statusFilter === sc.key ? 'all' : sc.key);
              handleFilterChange();
            }}
            className={cn(
              'rounded-lg border p-2 md:p-3 text-center transition-all hover:shadow-sm',
              statusFilter === sc.key
                ? cn(sc.color, 'ring-2 ring-offset-1 ring-primary/30')
                : 'bg-card border-border'
            )}
          >
            <p className="text-lg md:text-2xl font-semibold">{statusCounts[sc.key] || 0}</p>
            <p className="text-[10px] md:text-xs font-light mt-0.5">{sc.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="pl-10 font-light"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleFilterChange(); }}>
          <SelectTrigger className="w-full sm:w-48 font-light">
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
          <SelectTrigger className="w-full sm:w-40 font-light">
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
          <SelectTrigger className="w-full sm:w-44 font-light"><SelectValue placeholder="Cobrança" /></SelectTrigger>
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
          <SelectTrigger className="w-full sm:w-44 font-light"><SelectValue placeholder="Etiqueta" /></SelectTrigger>
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
            <SelectTrigger className="w-full sm:w-44 font-light">
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
            <Button variant="outline" className={cn('w-full sm:w-40 justify-start text-left font-light', !dateFrom && 'text-muted-foreground')}>
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
            <Button variant="outline" className={cn('w-full sm:w-40 justify-start text-left font-light', !dateTo && 'text-muted-foreground')}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); handleFilterChange(); }} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
            <X className="h-4 w-4" />
          </Button>
        )}
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

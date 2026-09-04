import { ShoppingBag, DollarSign, Users, Clock, TrendingUp, AlertTriangle, Package } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { OrdersTable } from '@/components/admin/OrdersTable';
import { SalesChart } from '@/components/admin/SalesChart';
import { OrdersStatusChart } from '@/components/admin/OrdersStatusChart';
import { TopProductsChart } from '@/components/admin/TopProductsChart';
import { ExportButton } from '@/components/admin/ExportButton';
import { QuickActions } from '@/components/admin/QuickActions';
import { useAdminData } from '@/hooks/useAdminData';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { orders, customers, stats, loading, updateOrderStatus } = useAdminData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calculate additional metrics
  const ticketMedio = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
  
  // Get pending/processing orders that need attention
  const ordersNeedingAttention = orders.filter(o => 
    o.status === 'pending' || o.status === 'paid' || o.status === 'processing'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6 overflow-hidden">
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide">Dashboard</h1>
          <p className="text-xs md:text-sm text-muted-foreground font-light mt-1">
            Visão geral da sua loja
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {ordersNeedingAttention > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-[10px] md:text-xs px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {ordersNeedingAttention} pendente{ordersNeedingAttention > 1 ? 's' : ''}
            </Badge>
          )}
          <ExportButton orders={orders} customers={customers} />
        </div>
      </div>

      {/* Stats Grid - 2 cols on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
        <StatsCard
          title="Total Pedidos"
          value={stats.totalOrders}
          icon={ShoppingBag}
        />
        <StatsCard
          title="Receita Total"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
        />
        <StatsCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={TrendingUp}
        />
        <StatsCard
          title="Pendentes"
          value={stats.pendingOrders}
          icon={Clock}
          className={stats.pendingOrders > 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""}
        />
        <StatsCard
          title="Estoque (un)"
          value={stats.totalInventory}
          icon={Package}
          className={stats.totalInventory < 10 ? "border-orange-500/30 bg-orange-500/5" : ""}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2">
          <SalesChart orders={orders} days={7} />
        </div>
        <OrdersStatusChart orders={orders} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <TopProductsChart orders={orders} limit={5} />
        
        {/* Quick Actions */}
        <QuickActions />
        
        {/* Quick Stats Card */}
        <div className="bg-card border rounded-lg p-3 md:p-4">
          <h3 className="text-[10px] md:text-xs tracking-[0.1em] uppercase text-muted-foreground font-light mb-3">
            Resumo
          </h3>
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Clientes</span>
              <span className="font-medium">{stats.totalCustomers}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Produtos</span>
              <span className="font-medium">{stats.totalProducts}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Pagos</span>
              <span className="font-medium">{orders.filter(o => o.status === 'paid').length}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Enviados</span>
              <span className="font-medium">{orders.filter(o => o.status === 'shipped').length}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Entregues</span>
              <span className="font-medium">{orders.filter(o => o.status === 'delivered').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-light tracking-wide">Pedidos Recentes</h2>
        </div>
        <OrdersTable orders={recentOrders} onStatusChange={updateOrderStatus} />
      </div>
    </div>
  );
}

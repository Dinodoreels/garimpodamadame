import { ShoppingBag, Package, Clock, CheckCircle, TrendingUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminProducts } from '@/hooks/useProductAdmin';
import { OrdersTable } from '@/components/admin/OrdersTable';
import { useMyStoreRole } from '@/hooks/useStores';
import { useAuth } from '@/hooks/useAuth';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function SellerDashboard() {
  const { user } = useAuth();
  const { data: storeInfo } = useMyStoreRole();
  const { orders, loading: ordersLoading, updateOrderStatus } = useAdminData();
  const { data: products = [], isLoading: productsLoading } = useAdminProducts();

  const isGerente = storeInfo?.role === 'gerente';
  const isExterno = storeInfo?.role === 'vendedor_externo';

  // Filter orders based on role
  const filteredOrders = orders.filter(o => {
    if (isGerente && storeInfo?.storeId) {
      // Manager sees all store orders + own created orders
      return o.store_id === storeInfo.storeId || o.created_by === user?.id;
    }
    // Vendedor and Vendedor Externo see only their own
    return o.created_by === user?.id;
  });

  const pendingOrders = filteredOrders.filter(o => o.status === 'pending' || o.status === 'paid').length;
  const completedOrders = filteredOrders.filter(o => o.status === 'delivered').length;
  const recentOrders = filteredOrders.slice(0, 5);

  // Calculate turnover for today
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = filteredOrders.filter(o => o.created_at?.startsWith(today));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const loading = ordersLoading || productsLoading;

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
      <div>
        <h1 className="text-xl md:text-2xl font-light tracking-wide">Dashboard</h1>
        <p className="text-sm text-muted-foreground font-light mt-1">
          {isGerente ? 'Visão geral da loja' : 'Visão geral das suas vendas'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-light tracking-wide uppercase text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Total Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-light">{filteredOrders.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-light tracking-wide uppercase text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-light">{pendingOrders}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-light tracking-wide uppercase text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Vendas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-light">{formatCurrency(todayRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{todayOrders.length} pedido{todayOrders.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        {!isExterno ? (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-light tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl md:text-3xl font-light">{products.length}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-light tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Entregues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl md:text-3xl font-light">{completedOrders}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-lg font-light tracking-wide mb-4">Últimos Pedidos</h2>
        {recentOrders.length > 0 ? (
          <OrdersTable orders={recentOrders} onStatusChange={updateOrderStatus} />
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground font-light">
              Nenhum pedido encontrado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

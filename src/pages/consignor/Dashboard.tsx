import { useMemo } from 'react';
import { Package, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConsignorItems, useConsignorSales, useConsignorPayments } from '@/hooks/useConsignorData';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConsignorDashboard() {
  const now = new Date();
  const { data: items = [], isLoading: l1 } = useConsignorItems();
  const { data: sales = [], isLoading: l2 } = useConsignorSales(now.getFullYear(), now.getMonth() + 1);
  const { data: payments = [], isLoading: l3 } = useConsignorPayments();

  const stats = useMemo(() => {
    const inStock = items.reduce((s, i) => s + i.in_stock, 0);
    const totalSold = items.reduce((s, i) => s + i.quantity_sold, 0);
    const monthRevenue = sales.reduce((s, x) => s + x.total_cost, 0);
    const totalOwed = items.reduce((s, i) => s + i.quantity_sold * i.unit_cost, 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { inStock, totalSold, monthRevenue, balance: totalOwed - totalPaid };
  }, [items, sales, payments]);

  const loading = l1 || l2 || l3;
  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-light tracking-wide">Resumo</h1>
        <p className="text-sm text-muted-foreground font-light mt-1">Visão geral das suas peças e vendas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-light uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl md:text-3xl font-light">{stats.inStock}</p></CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-light uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Total Vendido
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl md:text-3xl font-light">{stats.totalSold}</p></CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-light uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Receita do Mês
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl md:text-3xl font-light">{formatCurrency(stats.monthRevenue)}</p></CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-light uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Saldo a Receber
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl md:text-3xl font-light">{formatCurrency(stats.balance)}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}

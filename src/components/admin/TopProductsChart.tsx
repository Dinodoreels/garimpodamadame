import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminOrder } from '@/hooks/useAdminData';

interface TopProductsChartProps {
  orders: AdminOrder[];
  limit?: number;
}

export function TopProductsChart({ orders, limit = 5 }: TopProductsChartProps) {
  const chartData = useMemo(() => {
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    orders.forEach(order => {
      if (order.status === 'cancelled') return;
      
      order.order_items?.forEach((item: any) => {
        const key = item.product_title;
        if (!productStats[key]) {
          productStats[key] = { name: key, quantity: 0, revenue: 0 };
        }
        productStats[key].quantity += item.quantity;
        productStats[key].revenue += item.total_price;
      });
    });
    
    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map(item => ({
        ...item,
        // Truncate long names
        shortName: item.name.length > 15 ? item.name.slice(0, 15) + '...' : item.name,
      }));
  }, [orders, limit]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Receita: <span className="font-medium text-foreground">{formatCurrency(data.revenue)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Vendidos: <span className="font-medium text-foreground">{data.quantity} un</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="px-3 md:px-6 pt-3 md:pt-6">
          <CardTitle className="text-sm md:text-base font-medium">Top Produtos</CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          <div className="h-[120px] md:h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma venda
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardTitle className="text-sm md:text-base font-medium">Top {limit} Produtos</CardTitle>
      </CardHeader>
      <CardContent className="px-2 md:px-6 pb-3 md:pb-6">
        <div className="h-[140px] md:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis 
                type="number"
                tickFormatter={(value) => `R$${value}`}
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                hide={true}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

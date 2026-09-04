import { useMemo } from 'react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminOrder } from '@/hooks/useAdminData';

interface SalesChartProps {
  orders: AdminOrder[];
  days?: number;
}

export function SalesChart({ orders, days = 7 }: SalesChartProps) {
  const chartData = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    const salesByDay = dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayOrders = orders.filter(order => {
        const orderDate = startOfDay(new Date(order.created_at));
        return orderDate.getTime() === dayStart.getTime() && 
               (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered');
      });
      
      const total = dayOrders.reduce((sum, order) => sum + Number(order.total), 0);
      const count = dayOrders.length;
      
      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, "dd 'de' MMMM", { locale: ptBR }),
        vendas: total,
        pedidos: count,
      };
    });
    
    return salesByDay;
  }, [orders, days]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0]?.payload?.fullDate}</p>
          <p className="text-sm text-muted-foreground">
            Vendas: <span className="font-medium text-foreground">{formatCurrency(payload[0]?.value || 0)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Pedidos: <span className="font-medium text-foreground">{payload[0]?.payload?.pedidos || 0}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const totalPeriod = chartData.reduce((sum, d) => sum + d.vendas, 0);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <CardTitle className="text-sm md:text-base font-medium">
            Vendas - {days} dias
          </CardTitle>
          <span className="text-sm md:text-lg font-bold text-primary truncate">
            {formatCurrency(totalPeriod)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-2 md:px-6 pb-3 md:pb-6">
        <div className="h-[140px] md:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={(value) => `R$${value}`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={45}
                className="hidden md:block"
                hide={true}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="vendas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVendas)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

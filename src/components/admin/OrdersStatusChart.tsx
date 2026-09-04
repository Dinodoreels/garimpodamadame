import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminOrder } from '@/hooks/useAdminData';

interface OrdersStatusChartProps {
  orders: AdminOrder[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#eab308' },
  paid: { label: 'Pago', color: '#3b82f6' },
  processing: { label: 'Processando', color: '#8b5cf6' },
  shipped: { label: 'Enviado', color: '#6366f1' },
  delivered: { label: 'Entregue', color: '#22c55e' },
  cancelled: { label: 'Cancelado', color: '#ef4444' },
};

export function OrdersStatusChart({ orders }: OrdersStatusChartProps) {
  const chartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      const status = order.status || 'pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: STATUS_CONFIG[status]?.label || status,
        value: count,
        color: STATUS_CONFIG[status]?.color || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / orders.length) * 100).toFixed(1);
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} pedidos ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {payload.map((entry: any, index: number) => (
          <li key={index} className="flex items-center gap-1 text-xs">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader className="px-3 md:px-6 pt-3 md:pt-6">
          <CardTitle className="text-sm md:text-base font-medium">Status</CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          <div className="h-[120px] md:h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum pedido
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardTitle className="text-sm md:text-base font-medium">Status</CardTitle>
      </CardHeader>
      <CardContent className="px-2 md:px-6 pb-3 md:pb-6">
        <div className="h-[140px] md:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={45}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

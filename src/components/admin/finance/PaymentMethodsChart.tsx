import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { PaymentMethodBreakdown } from '@/hooks/useFinance';
import { CreditCard } from 'lucide-react';

interface Props {
  data: PaymentMethodBreakdown[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(217, 91%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(280, 65%, 60%)',
  'hsl(180, 60%, 45%)',
];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function PaymentMethodsChart({ data }: Props) {
  const empty = data.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-light flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Formas de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Sem dados no período
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 items-center">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.map((d, i) => (
                <div key={d.method} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-muted-foreground">{d.percent.toFixed(0)}%</span>
                    <span className="font-medium tabular-nums">{fmt(d.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

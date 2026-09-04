import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ExpenseByCategory } from '@/hooks/useFinance';
import { Wallet } from 'lucide-react';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function ExpensesByCategoryChart({ data }: { data: ExpenseByCategory[] }) {
  const empty = data.length === 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-light flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          Despesas por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Sem despesas no período
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 items-center">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.map((d) => (
                <div key={d.categoryId ?? 'sem'} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="truncate">{d.name}</span>
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

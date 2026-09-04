import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RevenueBySource } from '@/hooks/useFinance';
import { Store } from 'lucide-react';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function RevenueBySourceChart({ data }: { data: RevenueBySource[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-light flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          Receita por Canal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Sem dados no período</p>
        ) : (
          <div className="space-y-3">
            {data.map((d) => (
              <div key={d.source} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{d.label}</span>
                  <span className="font-medium tabular-nums">
                    {fmt(d.amount)} <span className="text-muted-foreground">({d.count})</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(d.amount / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

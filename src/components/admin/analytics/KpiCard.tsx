import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsMetric } from '@/hooks/useAnalytics';

function formatMetric(metric: AnalyticsMetric) {
  if (metric.format === 'percent') return `${metric.value.toFixed(1)}%`;
  if (metric.format === 'decimal') return metric.value.toFixed(1);
  return Math.round(metric.value).toLocaleString('pt-BR');
}

export function KpiCard({
  title,
  metric,
  icon: Icon,
  loading,
}: {
  title: string;
  metric?: AnalyticsMetric;
  icon: LucideIcon;
  loading?: boolean;
}) {
  const isPositive = (metric?.change || 0) >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        {loading || !metric ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-2xl font-semibold tracking-tight">{formatMetric(metric)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-secondary text-foreground">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 ${isPositive ? 'bg-secondary text-foreground' : 'bg-muted text-muted-foreground'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(metric.change).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs. período anterior</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

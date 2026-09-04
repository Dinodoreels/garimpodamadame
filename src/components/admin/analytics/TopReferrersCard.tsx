import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsBreakdownItem } from '@/hooks/useAnalytics';

export function TopReferrersCard({ data, loading }: { data?: AnalyticsBreakdownItem[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top referrers externos</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !data ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Sem referrers suficientes no período</div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{item.name}</span>
                  <span className="whitespace-nowrap font-medium">{item.value} · {item.percent.toFixed(0)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-muted">
                  <div className="h-full rounded-sm bg-primary" style={{ width: `${Math.max(item.percent, 4)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

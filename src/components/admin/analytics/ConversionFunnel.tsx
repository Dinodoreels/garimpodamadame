import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FunnelStep } from '@/hooks/useAnalytics';

export function ConversionFunnel({ steps, loading }: { steps?: FunnelStep[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funil de conversão</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !steps ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.label} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{index + 1}. {step.label}</span>
                  <span className="text-muted-foreground">{step.value.toLocaleString('pt-BR')} · {step.rate.toFixed(1)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-sm bg-muted">
                  <div
                    className="h-full rounded-sm bg-primary transition-all"
                    style={{ width: `${Math.max(step.rate, index === 0 ? 100 : 4)}%` }}
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

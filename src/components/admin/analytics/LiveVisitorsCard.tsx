import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LiveVisitorsCard({ value, loading }: { value?: number; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        {loading ? (
          <div className="w-full space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Visitantes ao vivo</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
                <p className="text-3xl font-semibold tracking-tight">{(value || 0).toLocaleString('pt-BR')}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Sessões com atividade nos últimos 5 minutos</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-secondary">
              <Activity className="h-5 w-5" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

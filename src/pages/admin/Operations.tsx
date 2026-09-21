import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOperationalFlow } from '@/hooks/useOperationalFlow';

const visuals = {
  ok: { label: 'Em dia', icon: CheckCircle2, className: 'border-success/30 bg-success/5 text-success' },
  attention: { label: 'Atenção', icon: AlertTriangle, className: 'border-warning/30 bg-warning/5 text-warning-foreground' },
  blocked: { label: 'Bloqueado', icon: CircleAlert, className: 'border-destructive/30 bg-destructive/5 text-destructive' },
};

export default function Operations() {
  const { data, isLoading, isFetching, refetch } = useOperationalFlow();
  return <div className="space-y-6">
    <AdminPageHeader title="Operacional" subtitle="Da chegada da carga ao pós-compra, com pendências e próxima ação" actions={<Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />Atualizar</Button>} />
    {isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <Skeleton key={index} className="h-44" />)}</div> : <>
      <div className="flex flex-wrap gap-2">
        <Badge variant="destructive">{data?.blocked ?? 0} bloqueios</Badge>
        <Badge variant="secondary">{data?.attention ?? 0} etapas pedindo atenção</Badge>
        <Badge variant="outline">Estoque Vanguard Store é a fonte central</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.stages.map(stage => {
          const visual = visuals[stage.status]; const Icon = visual.icon;
          return <Card key={stage.key} className={cn('border-l-4', visual.className)}><CardContent className="flex h-full flex-col gap-4 pt-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-medium text-foreground">{stage.title}</h2><p className="mt-1 text-sm text-muted-foreground">{stage.description}</p></div><Icon className="h-5 w-5 shrink-0" /></div>
            <div className="mt-auto flex items-end justify-between gap-3"><div><p className="text-2xl font-semibold text-foreground">{stage.count}</p><p className="text-xs text-muted-foreground">{visual.label}</p></div><Button asChild variant={stage.status === 'blocked' ? 'default' : 'outline'} size="sm"><Link to={stage.path}>{stage.action}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          </CardContent></Card>;
        })}
      </div>
    </>}
  </div>;
}
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign, TrendingUp, AlertCircle, Banknote, Wallet, Clock,
  ArrowRight, ClipboardCheck, Plus, Lock, Unlock, Boxes,
} from 'lucide-react';

interface Props { onNavigateTab: (tab: string) => void }

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function endOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

export function AccountingOverview({ onNavigateTab }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-overview'],
    queryFn: async () => {
      const start = startOfMonthISO();
      const end = endOfMonthISO();
      const today = new Date();
      const [ordersRes, expensesRes, openRegRes, lastInvRes] = await Promise.all([
        supabase.from('orders').select('total, status, created_at').gte('created_at', start).lte('created_at', end),
        supabase.from('expenses').select('amount, paid_at, due_date').gte('due_date', start.slice(0, 10)),
        supabase.from('cash_registers').select('id, opened_at, opening_amount, opened_by').eq('status', 'open').order('opened_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('inventory_closings').select('year, month').order('year', { ascending: false }).order('month', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const paid = ['paid', 'shipped', 'delivered', 'confirmed'];
      const orders = ordersRes.data || [];
      const revenue = orders.filter(o => paid.includes(o.status)).reduce((s, o) => s + Number(o.total || 0), 0);
      const ordersCount = orders.filter(o => paid.includes(o.status)).length;

      const expenses = expensesRes.data || [];
      const paidExpenses = expenses.filter(e => e.paid_at).reduce((s, e) => s + Number(e.amount), 0);
      const todayStr = today.toISOString().slice(0, 10);
      const overdue = expenses.filter(e => !e.paid_at && e.due_date < todayStr);
      const overdueSum = overdue.reduce((s, e) => s + Number(e.amount), 0);

      const netProfit = revenue - paidExpenses;

      const lastInv = lastInvRes.data;
      const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const needsInvClosing = !lastInv ||
        lastInv.year < prevMonthDate.getFullYear() ||
        (lastInv.year === prevMonthDate.getFullYear() && lastInv.month < prevMonthDate.getMonth() + 1);

      // open register stale (> 14h)
      let registerStaleHours = 0;
      if (openRegRes.data) {
        registerStaleHours = (Date.now() - new Date(openRegRes.data.opened_at).getTime()) / 3600000;
      }

      return {
        revenue, ordersCount, paidExpenses, netProfit,
        overdueCount: overdue.length, overdueSum,
        openRegister: openRegRes.data,
        registerStaleHours,
        needsInvClosing,
        lastInv,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const alerts: { tone: 'destructive' | 'warning'; title: string; desc: string; action?: () => void; actionLabel?: string }[] = [];
  if (!data.openRegister) {
    alerts.push({ tone: 'warning', title: 'Caixa fechado', desc: 'Nenhum caixa físico aberto agora.', action: () => onNavigateTab('cash'), actionLabel: 'Abrir caixa' });
  } else if (data.registerStaleHours > 14) {
    alerts.push({ tone: 'destructive', title: 'Caixa aberto há muito tempo', desc: `Aberto há ${Math.round(data.registerStaleHours)}h. Lembre-se de fechar.`, action: () => onNavigateTab('cash'), actionLabel: 'Fechar caixa' });
  }
  if (data.overdueCount > 0) {
    alerts.push({ tone: 'destructive', title: `${data.overdueCount} despesa(s) vencida(s)`, desc: `Total em atraso: ${formatBRL(data.overdueSum)}`, action: () => onNavigateTab('expenses'), actionLabel: 'Ver despesas' });
  }
  if (data.needsInvClosing) {
    alerts.push({ tone: 'warning', title: 'Estoque do mês anterior não fechado', desc: 'Gere o snapshot mensal para travar o histórico contábil.', action: () => onNavigateTab('inventory'), actionLabel: 'Fechar estoque' });
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Receita do mês</p>
            </div>
            <p className="text-xl font-light">{formatBRL(data.revenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.ordersCount} pedidos pagos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Lucro estimado</p>
            </div>
            <p className={`text-xl font-light ${data.netProfit < 0 ? 'text-destructive' : ''}`}>{formatBRL(data.netProfit)}</p>
            <p className="text-xs text-muted-foreground mt-1">Receita − despesas pagas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Caixa físico</p>
            </div>
            {data.openRegister ? (
              <>
                <Badge variant="default" className="text-[10px]">ABERTO</Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  há {formatDistanceToNowStrict(new Date(data.openRegister.opened_at), { locale: ptBR })}
                </p>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="text-[10px]">FECHADO</Badge>
                <p className="text-xs text-muted-foreground mt-1">Nenhuma sessão ativa</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Despesas vencidas</p>
            </div>
            <p className={`text-xl font-light ${data.overdueCount > 0 ? 'text-destructive' : ''}`}>
              {data.overdueCount > 0 ? formatBRL(data.overdueSum) : 'Nenhuma'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{data.overdueCount} item(ns)</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {alerts.map((a, i) => (
            <Card key={i} className={a.tone === 'destructive' ? 'border-destructive/50 bg-destructive/5' : 'border-amber-500/40 bg-amber-500/5'}>
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 mt-0.5 ${a.tone === 'destructive' ? 'text-destructive' : 'text-amber-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
                {a.action && (
                  <Button size="sm" variant="outline" onClick={a.action} className="flex-shrink-0">
                    {a.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Ações rápidas</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigateTab('cash')}>
              {data.openRegister ? <Lock className="h-3.5 w-3.5 mr-1.5" /> : <Unlock className="h-3.5 w-3.5 mr-1.5" />}
              {data.openRegister ? 'Fechar caixa' : 'Abrir caixa'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigateTab('expenses')}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova despesa
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigateTab('closing')}>
              <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Fechamento do período
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigateTab('inventory')}>
              <Boxes className="h-3.5 w-3.5 mr-1.5" /> Fechar estoque mensal
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigateTab('finance')}>
              <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Ver DRE
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dica: as abas acima reúnem todas as páginas contábeis. Os links antigos do menu continuam funcionando.
      </p>
    </div>
  );
}
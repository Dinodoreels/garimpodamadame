import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  value: string | number;
  previousValue?: number | null;
  currentValue?: number;
  icon: LucideIcon;
  isCurrency?: boolean;
  invertColors?: boolean;
}

export function PeriodComparisonCard({ title, value, previousValue, currentValue, icon: Icon, invertColors }: Props) {
  const hasComparison = previousValue != null && currentValue != null;
  let pct: number | null = null;
  if (hasComparison) {
    if (previousValue === 0) {
      pct = currentValue > 0 ? 100 : 0;
    } else {
      pct = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    }
  }
  const positive = (pct ?? 0) > 0;
  const negative = (pct ?? 0) < 0;
  const goodColor = invertColors ? 'text-destructive' : 'text-green-600 dark:text-green-400';
  const badColor = invertColors ? 'text-green-600 dark:text-green-400' : 'text-destructive';

  return (
    <div className="bg-background border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-light">{value}</p>
      {pct !== null && (
        <div className={cn(
          "flex items-center gap-1 mt-1 text-[11px]",
          positive && goodColor,
          negative && badColor,
          !positive && !negative && 'text-muted-foreground',
        )}>
          {positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span>{pct > 0 ? '+' : ''}{pct.toFixed(1)}% vs. anterior</span>
        </div>
      )}
    </div>
  );
}
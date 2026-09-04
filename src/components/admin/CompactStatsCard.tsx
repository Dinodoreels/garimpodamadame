import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  className?: string;
}

export function CompactStatsCard({ 
  title, 
  value, 
  icon: Icon,
  trend,
  className 
}: CompactStatsCardProps) {
  return (
    <div className={cn("bg-background p-2 md:p-4 border border-border flex items-center gap-3", className)}>
      <div className="p-1.5 md:p-2 bg-muted rounded shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg md:text-xl font-light truncate">{value}</p>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{title}</span>
          {trend !== undefined && trend !== 0 && (
            <span className={cn("text-[10px] shrink-0", trend >= 0 ? "text-emerald-500" : "text-destructive")}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
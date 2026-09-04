import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  className 
}: StatsCardProps) {
  return (
    <div className={cn("bg-background p-2.5 md:p-5 border border-border", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
          <p className="text-[10px] md:text-xs tracking-[0.1em] md:tracking-[0.15em] uppercase text-muted-foreground font-light leading-tight">
            {title}
          </p>
          <p className="text-base md:text-2xl font-light tracking-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground font-light truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={cn(
              "text-[10px] md:text-xs font-light",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}% vs mês anterior
            </p>
          )}
        </div>
        <div className="p-2 md:p-3 bg-muted hidden md:block">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

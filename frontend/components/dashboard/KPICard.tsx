import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  loading?: boolean;
  className?: string;
}

export function KPICard({
  title, value, change, prefix = "", suffix = "",
  isCurrency = false, icon, iconBg = "gradient-primary", loading = false, className
}: KPICardProps) {
  const formatted = isCurrency
    ? formatCurrency(typeof value === "number" ? value : parseFloat(String(value)) || 0)
    : `${prefix}${typeof value === "number" ? value.toLocaleString("en-IN") : value}${suffix}`;

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  if (loading) {
    return (
      <div className={cn("card-base p-5", className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-10 w-10 rounded-xl" />
        </div>
        <div className="skeleton h-8 w-36 rounded mb-2" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>
    );
  }

  return (
    <div className={cn("card-base card-hover p-5 animate-fade-in-up", className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight mb-1">{formatted}</p>
      {change !== undefined && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground")}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          <span>{formatPercent(change)} vs prev period</span>
        </div>
      )}
    </div>
  );
}

// Skeleton set for a row of 4 KPI cards
export function KPICardSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <KPICard key={i} title="" value="" loading />
      ))}
    </>
  );
}

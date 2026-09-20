import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  loading?: boolean;
  minHeight?: string;
}

export function ChartCard({
  title, description, children, actions, className, loading = false, minHeight = "280px"
}: ChartCardProps) {
  return (
    <div className={cn("card-base p-5 animate-fade-in-up", className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {loading ? (
        <div className="skeleton rounded-lg" style={{ height: minHeight }} />
      ) : (
        <div style={{ minHeight }}>{children}</div>
      )}
    </div>
  );
}

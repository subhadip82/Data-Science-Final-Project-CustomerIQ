import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw, PackageOpen, Upload } from "lucide-react";
import Link from "next/link";

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
        {icon ?? <PackageOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-opacity"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white gradient-primary hover:opacity-90 transition-opacity"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {message && <p className="text-sm text-muted-foreground max-w-xs mb-6">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="card-base p-5">
            <div className="skeleton h-4 w-24 rounded mb-3" />
            <div className="skeleton h-8 w-32 rounded mb-2" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-base p-5">
          <div className="skeleton h-4 w-32 rounded mb-4" />
          <div className="skeleton h-64 w-full rounded-lg" />
        </div>
        <div className="card-base p-5">
          <div className="skeleton h-4 w-32 rounded mb-4" />
          <div className="skeleton h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── No Dataset State ─────────────────────────────────────────────────────────
export function NoDatasetState() {
  return (
    <EmptyState
      icon={<Upload className="w-8 h-8" />}
      title="No dataset uploaded yet"
      description="Upload a CSV or XLSX dataset to explore analytics, segmentation, and machine learning."
      action={{ label: "Upload Data", href: "/app/upload" }}
    />
  );
}

// ─── Module Unavailable State (Conditional Module System) ─────────────────────
interface ModuleUnavailableStateProps {
  moduleName: string;
  reason: string;
  requiredFields?: string[];
  suggestedModules?: { label: string; href: string }[];
}

export function ModuleUnavailableState({
  moduleName,
  reason,
  requiredFields = [],
  suggestedModules = [
    { label: "Data Profile", href: "/app/data-profile" },
    { label: "Clustering & Segments", href: "/app/segments" },
    { label: "Switch Dataset", href: "/app/datasets" },
  ],
}: ModuleUnavailableStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-xl mx-auto animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 text-amber-400">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{moduleName} Not Available</h2>
      <p className="text-sm text-white/70 mb-6">{reason}</p>

      {requiredFields.length > 0 && (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left mb-6">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Required Fields For This Module:</p>
          <div className="flex flex-wrap gap-2">
            {requiredFields.map((f, i) => (
              <span key={i} className="px-2.5 py-1 rounded bg-white/10 text-white/80 font-mono text-xs border border-white/10">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 w-full">
        <p className="text-xs text-white/50">Suggested Alternative Views & Actions:</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {suggestedModules.map((s, idx) => (
            <Link
              key={idx}
              href={s.href}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors"
            >
              {s.label}
            </Link>
          ))}
          <Link
            href="/app/upload"
            className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Upload Suitable Dataset
          </Link>
        </div>
      </div>
    </div>
  );
}


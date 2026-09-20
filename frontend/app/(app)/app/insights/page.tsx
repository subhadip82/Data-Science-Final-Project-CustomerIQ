"use client";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { insightsApi } from "@/lib/api/client";
import { NoDatasetState, ErrorState, PageSkeleton } from "@/components/shared/States";
import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, Lightbulb, BarChart2, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

const typeConfig: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  trend:        { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  distribution: { icon: BarChart2, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  correlation:  { icon: Lightbulb, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  anomaly:      { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  comparison:   { icon: ShieldCheck, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
};

const priorityBadges: Record<string, string> = {
  high: "text-rose-400 bg-rose-500/15 border border-rose-500/30",
  medium: "text-amber-400 bg-amber-500/15 border border-amber-500/30",
  low: "text-white/60 bg-white/10 border border-white/10",
};

export default function InsightsPage() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await request((t) => insightsApi.get(t));
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data?.has_dataset || !data?.insights?.length) return <NoDatasetState />;

  const insights: any[] = data.insights;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Business Insights Engine</h1>
        <p className="text-sm text-white/60 mt-1">
          {insights.length} fact-based insight{insights.length !== 1 ? "s" : ""} mathematically derived from {data.dataset_name || "active dataset"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {insights.map((insight) => {
          const config = typeConfig[insight.type] || typeConfig.trend;
          const Icon = config.icon;

          return (
            <div key={insight.id || insight.title} className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", config.bg)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{insight.title}</h3>
                    <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">
                      Type: {insight.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider", priorityBadges[insight.priority] || priorityBadges.low)}>
                    {insight.priority} Priority
                  </span>
                </div>
              </div>

              {/* Finding & Evidence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/5 p-3.5 rounded-xl">
                  <p className="text-white/40 uppercase font-semibold text-[10px] tracking-wider mb-1">Observed Finding</p>
                  <p className="text-white/90 leading-relaxed font-medium">{insight.finding}</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl">
                  <p className="text-white/40 uppercase font-semibold text-[10px] tracking-wider mb-1">Mathematical Evidence</p>
                  <p className="text-white/70 leading-relaxed font-mono">{insight.evidence}</p>
                </div>
              </div>

              {/* Interpretation */}
              <div className="text-xs text-white/70 bg-[hsl(var(--brand-primary)/0.04)] border border-[hsl(var(--brand-primary)/0.1)] p-3.5 rounded-xl">
                <p className="text-[hsl(var(--brand-primary))] uppercase font-semibold text-[10px] tracking-wider mb-1">Business Interpretation</p>
                <p className="leading-relaxed">{insight.interpretation}</p>
              </div>

              {/* Recommended Action */}
              {insight.recommended_action && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs">
                    <span className="text-emerald-400 font-semibold">Recommended Action: </span>
                    <span className="text-white/80">{insight.recommended_action}</span>
                  </div>
                  {insight.metric && (
                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                      <span className="text-white/40">{insight.metric}:</span>
                      <span className="font-bold text-white">{insight.metric_value}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

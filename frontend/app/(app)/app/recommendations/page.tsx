"use client";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { recommendationsApi } from "@/lib/api/client";
import { NoDatasetState, ErrorState, PageSkeleton } from "@/components/shared/States";
import { cn } from "@/lib/utils";
import { Zap, CheckCircle2, Clock, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";

const impactBadges: Record<string, string> = {
  high: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  low: "text-white/50 bg-white/10 border-white/10",
};

const effortBadges: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  high: "text-rose-400 bg-rose-500/10 border-rose-500/30",
};

export default function RecommendationsPage() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await request((t) => recommendationsApi.get(t));
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
  if (!data?.has_dataset || !data?.recommendations?.length) return <NoDatasetState />;

  const recommendations: any[] = data.recommendations;

  const toggleStatus = (id: string) => {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === "completed" ? "open" : "completed",
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Action Recommendations</h1>
        <p className="text-sm text-white/60 mt-1">
          Strategic operational initiatives grounded in observed data patterns from {data.dataset_name || "active dataset"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {recommendations.map((rec) => {
          const recId = rec.id || rec.title;
          const status = statuses[recId] || rec.status || "open";
          const isDone = status === "completed";

          return (
            <div
              key={recId}
              className={`glass-card p-6 rounded-2xl border transition-all ${
                isDone ? "border-emerald-500/30 bg-emerald-500/5 opacity-75" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                    <h3 className="text-base font-semibold text-white">{rec.title}</h3>
                  </div>
                  <span className="text-[11px] text-white/40 uppercase font-semibold tracking-wider">
                    Category: {rec.category || "Optimization"}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider", impactBadges[rec.impact] || impactBadges.medium)}>
                    Impact: {rec.impact}
                  </span>
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider", effortBadges[rec.effort] || effortBadges.medium)}>
                    Effort: {rec.effort}
                  </span>
                  <button
                    onClick={() => toggleStatus(recId)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                      isDone
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isDone ? "Completed" : "Mark Done"}
                  </button>
                </div>
              </div>

              {/* Observed Fact vs Recommended Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/5 p-4 rounded-xl space-y-1">
                  <span className="text-white/40 uppercase font-bold text-[10px] tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Observed Fact
                  </span>
                  <p className="text-white/80 font-medium leading-relaxed">{rec.finding}</p>
                </div>

                <div className="bg-[hsl(var(--brand-primary)/0.06)] border border-[hsl(var(--brand-primary)/0.15)] p-4 rounded-xl space-y-1">
                  <span className="text-[hsl(var(--brand-primary))] uppercase font-bold text-[10px] tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Recommended Action
                  </span>
                  <p className="text-white/90 leading-relaxed font-medium">{rec.recommendation}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

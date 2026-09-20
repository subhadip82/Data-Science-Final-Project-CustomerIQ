"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { reportsApi } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/Badges";
import { EmptyState, ErrorState } from "@/components/shared/States";
import { timeAgo } from "@/lib/utils";
import {
  FileText, Trash2, Plus, Download, RefreshCw, Share2,
  Eye, CheckCircle2, ShieldCheck, ChevronDown, X,
  Sparkles, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { ShareAnalysisModal } from "@/components/shared/ShareAnalysisModal";

const REPORT_TYPES = [
  { id: "summary", label: "Executive Summary", desc: "Key performance indicators, data quality score, and high-priority insights." },
  { id: "features", label: "Feature Importance & Key Drivers", desc: "Top predictor ranking, directional influence, and automated operational levers." },
  { id: "full", label: "Comprehensive Analysis", desc: "Complete end-to-end audit with EDA, statistics, ML leaderboard, and playbooks." },
  { id: "statistics", label: "Statistical & Correlation Audit", desc: "Parametric/non-parametric tests, Pearson/Spearman matrices, and significance." },
  { id: "ml", label: "Machine Learning Benchmark", desc: "Supervised algorithm evaluation, accuracy, F1/RMSE comparisons." },
  { id: "business", label: "Strategic Business Playbook", desc: "Actionable recommendations categorized by impact and operational effort." },
];

export default function ReportsPage() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View modal state
  const [viewingReport, setViewingReport] = useState<any | null>(null);

  // Share modal state
  const [sharingReport, setSharingReport] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await request((t) => reportsApi.list(t));
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generateReport = async (type: string) => {
    setGeneratingType(type);
    setShowGenerateMenu(false);
    try {
      await request((t) => reportsApi.generate(t, type));
      await load();
    } catch (e: any) {
      alert("Failed to generate report: " + e.message);
    } finally {
      setGeneratingType(null);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      await request((t) => reportsApi.delete(t, id));
      await load();
    } catch {}
  };

  const downloadReport = (report: any) => {
    const jsonStr = JSON.stringify(report.summary || report, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const items: any[] = data?.items || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analysis Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.total ?? 0} executive and specialized analytical reports generated for your active workspace.
          </p>
        </div>

        {/* Generate Report Button with Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowGenerateMenu(!showGenerateMenu)}
            disabled={!!generatingType}
            className="px-4 py-2.5 rounded-2xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
          >
            {generatingType ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Generate Report</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </button>

          {showGenerateMenu && (
            <div className="absolute right-0 mt-2 w-80 glass-card bg-background/95 border border-border/80 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in divide-y divide-border/40">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Report Architecture
              </div>
              <div className="py-1 space-y-1">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.id}
                    onClick={() => generateReport(rt.id)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-xs space-y-0.5 group"
                  >
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                      {rt.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-normal">
                      {rt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card divide-y divide-border rounded-3xl overflow-hidden border border-border/60">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !items.length ? (
        <div className="glass-card p-12 text-center rounded-3xl flex flex-col items-center justify-center border border-border/60">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4 text-muted-foreground">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Reports Generated Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Generate executive summaries, statistical audits, or full analytical briefs from your active dataset.
          </p>
          <button
            onClick={() => generateReport("summary")}
            className="px-5 py-2.5 rounded-2xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> Generate Executive Summary
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden divide-y divide-border/50 rounded-3xl border border-border/60">
          {items.map((report) => (
            <div key={report.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                <FileText className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{report.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="capitalize">{report.type}</span> · {timeAgo(report.created_at)}
                </p>
              </div>

              <StatusBadge status={report.status} />

              <div className="flex items-center gap-1">
                {/* View Report */}
                <button
                  onClick={() => setViewingReport(report)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="View report details"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Share by Email / Link */}
                <button
                  onClick={() => setSharingReport(report)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Share report via email"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Download */}
                <button
                  onClick={() => downloadReport(report)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Download JSON summary"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteReport(report.id)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Delete report"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Viewer Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl glass-card bg-background/95 border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-base font-bold text-foreground">{viewingReport.name}</h3>
                  <p className="text-xs text-muted-foreground">Generated {new Date(viewingReport.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-foreground">
              {viewingReport.summary?.dataset_overview && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
                  <h4 className="font-bold text-primary uppercase text-[11px] tracking-wider">Dataset Overview</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Name:</span>
                      <span className="font-semibold">{viewingReport.summary.dataset_overview.dataset_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Domain:</span>
                      <span className="font-semibold capitalize">{viewingReport.summary.dataset_overview.dataset_type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Rows:</span>
                      <span className="font-semibold font-mono">{viewingReport.summary.dataset_overview.rows?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Columns:</span>
                      <span className="font-semibold font-mono">{viewingReport.summary.dataset_overview.columns}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewingReport.summary?.data_quality && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
                  <h4 className="font-bold text-emerald-500 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Data Quality Score: {viewingReport.summary.data_quality.quality_score}/100
                  </h4>
                  <p className="text-muted-foreground">
                    Missing Values: {viewingReport.summary.data_quality.missing_pct}% · Duplicates: {viewingReport.summary.data_quality.duplicates}
                  </p>
                </div>
              )}

              {/* Feature Importance & Predictive Drivers */}
              {viewingReport.summary?.feature_importance?.features?.length > 0 && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-violet-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      Key Drivers & Feature Ranking
                    </h4>
                    {viewingReport.summary.feature_importance.primary_driver && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Primary Driver: {viewingReport.summary.feature_importance.primary_driver}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Target evaluated: <span className="font-semibold text-foreground font-mono">{viewingReport.summary.feature_importance.target_column}</span> · Task: <span className="capitalize">{viewingReport.summary.feature_importance.task_type}</span>
                  </p>
                  <div className="space-y-2 pt-1">
                    {viewingReport.summary.feature_importance.features.slice(0, 6).map((f: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-background/50 border border-border/40 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground font-mono">{f.column}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-primary">{f.importance_pct}% weight</span>
                            {f.directional_impact === "positive" ? (
                              <span className="flex items-center gap-0.5 text-emerald-400 text-[10px] font-semibold"><TrendingUp className="w-3 h-3" /> Positive</span>
                            ) : f.directional_impact === "negative" ? (
                              <span className="flex items-center gap-0.5 text-rose-400 text-[10px] font-semibold"><TrendingDown className="w-3 h-3" /> Negative</span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-muted-foreground text-[10px] font-semibold"><Minus className="w-3 h-3" /> Neutral</span>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                            style={{ width: `${Math.min(100, Math.max(4, f.importance_pct * 2))}%` }}
                          />
                        </div>
                        {f.takeaway && (
                          <p className="text-[10.5px] text-muted-foreground italic leading-tight">{f.takeaway}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingReport.summary?.insights && viewingReport.summary.insights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground uppercase text-[11px] tracking-wider">Discovered Business Insights</h4>
                  <div className="space-y-2">
                    {viewingReport.summary.insights.map((ins: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                        <div className="font-semibold text-foreground">{ins.title}</div>
                        <p className="text-muted-foreground">{ins.finding}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingReport.summary?.recommendations && viewingReport.summary.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground uppercase text-[11px] tracking-wider">Strategic Recommendations</h4>
                  <div className="space-y-2">
                    {viewingReport.summary.recommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                        <div className="font-semibold text-foreground">🎯 {rec.title}</div>
                        <p className="text-muted-foreground">{rec.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingReport.summary?.limitations && (
                <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 space-y-1 text-muted-foreground text-[11px]">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] block">Audit Limitations:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {viewingReport.summary.limitations.map((lim: string, idx: number) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between">
              <button
                onClick={() => downloadReport(viewingReport)}
                className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download JSON
              </button>
              <button
                onClick={() => {
                  const target = viewingReport;
                  setViewingReport(null);
                  setSharingReport(target);
                }}
                className="px-4 py-1.5 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shadow"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {sharingReport && (
        <ShareAnalysisModal
          isOpen={true}
          onClose={() => setSharingReport(null)}
          reportId={sharingReport.id}
          datasetName={sharingReport.name}
        />
      )}
    </div>
  );
}

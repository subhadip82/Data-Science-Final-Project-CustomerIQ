"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ShieldCheck, AlertCircle, BarChart2, Lightbulb, Star,
  Calendar, Layers, CheckCircle2, Lock, ArrowUpRight
} from "lucide-react";
import { shareApi } from "@/lib/api/client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function SharedReportPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    shareApi
      .getView(token)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Shared report is invalid or has expired.");
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Verifying security token and loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-border text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error || "This shared report link may have expired or been revoked by the workspace owner."}
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all shadow"
          >
            Visit CustomerIQ
          </Link>
        </div>
      </div>
    );
  }

  const sections = data.allowed_sections || ["summary", "visualizations", "insights", "recommendations"];
  const summary = data.summary || {};
  const overview = data.dataset_overview || {};

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-md">
            CIQ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-foreground">CustomerIQ</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                Shared Report
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Secure Read-Only Analytical Snapshot</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Authenticated Link
          </span>
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Open Platform <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-8 animate-fade-in">
        
        {/* Title Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border/80 space-y-3 shadow-sm bg-muted/10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {data.title || overview.name || "Dataset Analysis Report"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
            {overview.name && (
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-primary" /> Dataset: <strong className="text-foreground">{overview.name}</strong>
              </span>
            )}
            {overview.rows && (
              <span>• {overview.rows?.toLocaleString()} rows</span>
            )}
            {overview.columns && (
              <span>• {overview.columns} columns</span>
            )}
            {overview.type && (
              <span className="capitalize">• {overview.type}</span>
            )}
            {data.created_at && (
              <span className="flex items-center gap-1">
                • <Calendar className="w-3.5 h-3.5" /> {new Date(data.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Section: Summary */}
        {sections.includes("summary") && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" /> Executive Summary & KPIs
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {summary.kpis && summary.kpis.length > 0 ? (
                summary.kpis.map((kpi: any, idx: number) => (
                  <div key={idx} className="glass-card p-4 rounded-2xl border border-border space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">{kpi.label}</p>
                    <p className="text-lg font-bold text-foreground font-mono">
                      {kpi.is_currency ? `$${Number(kpi.value).toLocaleString()}` : String(kpi.value)}
                      {kpi.suffix || ""}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="glass-card p-4 rounded-2xl border border-border space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Rows Audited</p>
                    <p className="text-lg font-bold text-foreground font-mono">{overview.rows?.toLocaleString() || "—"}</p>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-border space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Feature Dimensions</p>
                    <p className="text-lg font-bold text-foreground font-mono">{overview.columns || "—"}</p>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-border space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Data Quality</p>
                    <p className="text-lg font-bold text-emerald-500 font-mono">{overview.quality_score ? `${overview.quality_score}/100` : "Verified"}</p>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-border space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Archetype</p>
                    <p className="text-lg font-bold text-primary capitalize truncate">{overview.type || "Tabular"}</p>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Section: Visualizations */}
        {sections.includes("visualizations") && data.visualizations && data.visualizations.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" /> Automated Visualizations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.visualizations.map((v: any, idx: number) => (
                <div key={idx} className="glass-card p-5 rounded-3xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-foreground">{v.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                      {v.chart_type}
                    </span>
                  </div>
                  <div className="h-44 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center p-4">
                    <div className="text-center space-y-1">
                      <BarChart2 className="w-8 h-8 text-primary/60 mx-auto" />
                      <p className="text-[11px] text-muted-foreground font-mono">
                        X: {v.x_col || "Index"} {v.y_col ? `• Y: ${v.y_col}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Insights */}
        {sections.includes("insights") && data.insights && data.insights.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" /> Key Insights & Findings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.insights.map((ins: any, idx: number) => (
                <div key={idx} className="glass-card p-5 rounded-3xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-foreground">{ins.title}</h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {ins.priority || "Medium"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ins.finding}</p>
                  {ins.evidence && (
                    <p className="text-[11px] font-mono text-primary/80 bg-primary/5 p-2 rounded-xl border border-primary/10">
                      Evidence: {ins.evidence}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Recommendations */}
        {sections.includes("recommendations") && data.recommendations && data.recommendations.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-orange-400" /> Strategic Action Playbooks
            </h2>
            <div className="space-y-3">
              {data.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="glass-card p-5 rounded-3xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {rec.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold uppercase">
                        Impact: {rec.impact || "High"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold uppercase">
                        Effort: {rec.effort || "Medium"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.recommendation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Generated by <strong className="text-foreground">CustomerIQ Universal Data Platform</strong>. Private workspace data remains strictly protected.
      </footer>
    </div>
  );
}

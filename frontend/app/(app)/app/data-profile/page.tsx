"use client";
import { useState, useEffect } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { dataProfileApi } from "@/lib/api/client";
import {
  Database, AlertTriangle, CheckCircle2, FileText, Layers,
  TrendingUp, RefreshCw, BarChart2, ShieldCheck, Sparkles
} from "lucide-react";
import Link from "next/link";

export default function DataProfilePage() {
  const { request } = useApi();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request((token) => dataProfileApi.get(token));
      setProfile(data);
    } catch (err: any) {
      setError(err.message || "Failed to load data profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[hsl(var(--brand-primary))]" />
          <p className="text-sm text-white/60">Analyzing dataset profile and quality metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !profile.has_dataset) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Data Profile & Quality</h1>
          <p className="text-sm text-white/60 mt-1">In-depth statistical breakdown, column types, and data health auditing.</p>
        </div>
        <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/40">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Dataset Available</h3>
          <p className="text-sm text-white/60 max-w-md mb-6">
            Upload a structured CSV or XLSX dataset to inspect column profiles, data types, missingness, and automated quality diagnostics.
          </p>
          <Link
            href="/app/upload"
            className="px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Upload Dataset
          </Link>
        </div>
      </div>
    );
  }

  const score = profile.quality_score || 0;
  const scoreColor =
    score >= 85
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : score >= 65
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{profile.dataset_name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[hsl(var(--brand-primary)/0.2)] text-[hsl(var(--brand-primary))] border border-[hsl(var(--brand-primary)/0.3)]">
              {profile.dataset_type}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            {profile.filename} • {profile.row_count.toLocaleString()} rows • {profile.column_count} columns • {profile.memory_usage_kb} KB in memory
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchProfile}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium border border-white/10 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-profile
          </button>
          <Link
            href="/app/datasets"
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium border border-white/10 transition-colors flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5" /> Switch Dataset
          </Link>
        </div>
      </div>

      {/* Quality Score & High-Level Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Quality Score Card */}
        <div className="glass-card p-5 rounded-2xl md:col-span-2 flex items-center gap-5">
          <div className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center shrink-0 ${scoreColor}`}>
            <span className="text-3xl font-extrabold tracking-tight">{score}</span>
            <span className="text-[10px] uppercase font-semibold">/ 100</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-white/60" />
              <h3 className="text-sm font-semibold text-white">Dataset Quality Score</h3>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Calculated using missing cell ratio, duplicate rows, constant column variances, and IQR outliers.
            </p>
            <p className="text-xs font-medium text-white/80 mt-2">
              Status: {score >= 85 ? "Production Ready" : score >= 65 ? "Requires Preprocessing" : "Needs Cleansing"}
            </p>
          </div>
        </div>

        {/* Row & Column Card */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-medium text-white/60">Dimensions</span>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white">{profile.row_count.toLocaleString()}</div>
            <p className="text-xs text-white/50">{profile.column_count} features across records</p>
          </div>
          <span className="text-[11px] text-white/40 mt-1">Duplicates: {profile.duplicate_rows} rows</span>
        </div>

        {/* Domain Classification Card */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-medium text-white/60">Domain Classifier</span>
          <div className="mt-2">
            <div className="text-lg font-bold text-white capitalize">{profile.dataset_type}</div>
            <p className="text-xs text-white/50">{profile.type_confidence}% confidence</p>
          </div>
          <span className="text-[11px] text-white/40 truncate mt-1">{profile.type_reason}</span>
        </div>
      </div>

      {/* Suggested Transformations & Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Detected Data Issues ({profile.issues?.length || 0})</span>
          </div>
          {profile.issues && profile.issues.length > 0 ? (
            <ul className="space-y-2 text-xs text-white/70">
              {profile.issues.map((issue: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg">
                  <span className="text-amber-400">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/50">No critical anomalies or missing data flags detected.</p>
          )}
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Recommended Preprocessing ({profile.recommendations?.length || 0})</span>
          </div>
          {profile.recommendations && profile.recommendations.length > 0 ? (
            <ul className="space-y-2 text-xs text-white/70">
              {profile.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 bg-white/5 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/50">Dataset is cleanly formatted and ready for model training.</p>
          )}
        </div>
      </div>

      {/* Column Breakdown Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Column Profiles & Statistical Distributions</h3>
            <p className="text-xs text-white/60 mt-0.5">Summary of types, unique cardinalities, missingness, and detected distributions.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/70">
            <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-semibold border-b border-white/10 text-[10px]">
              <tr>
                <th className="px-4 py-3">Column Name</th>
                <th className="px-4 py-3">Data Type</th>
                <th className="px-4 py-3">Semantic Role</th>
                <th className="px-4 py-3 text-right">Missing</th>
                <th className="px-4 py-3 text-right">Unique Values</th>
                <th className="px-4 py-3 text-right">Outliers (IQR)</th>
                <th className="px-4 py-3">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {profile.columns?.map((col: any) => (
                <tr key={col.name} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-white">{col.name}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[11px]">
                      {col.data_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11px] text-white/60 capitalize">{col.semantic_type}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    {col.missing_pct > 0 ? (
                      <span className="text-amber-400">{col.missing_pct}%</span>
                    ) : (
                      <span className="text-white/40">0%</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-white/80">
                    {col.unique_count?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    {col.outlier_count > 0 ? (
                      <span className="text-rose-400">{col.outlier_count}</span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 max-w-xs truncate text-white/50 font-mono text-[10px]">
                    {col.sample_values?.slice(0, 3).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { segmentsApi } from "@/lib/api/client";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { NoDatasetState, ErrorState, PageSkeleton, ModuleUnavailableState } from "@/components/shared/States";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from "recharts";
import { Layers, Sparkles, Sliders, RefreshCw } from "lucide-react";

export default function SegmentsPage() {
  const { request } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [clusterCount, setClusterCount] = useState<number>(3);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadSegments = async (k?: number) => {
    setIsUpdating(true);
    try {
      const q = k ? `?n_clusters=${k}` : "";
      const res = await request((token) =>
        fetch(`http://localhost:8000/api/v1/segments${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json())
      );
      setData(res);
      if (res?.n_clusters) {
        setClusterCount(res.n_clusters);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load clustering analysis.");
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    loadSegments();
  }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => loadSegments()} />;
  if (!data?.has_dataset) return <NoDatasetState />;
  if (data?.available === false) {
    return (
      <ModuleUnavailableState
        moduleName="Unsupervised Clustering"
        reason={data.reason || "Clustering requires at least 2 continuous numerical features and at least 10 rows."}
        requiredFields={["At least 2 Numerical Continuous Variables"]}
      />
    );
  }

  const { segments, pca_points, n_clusters, elbow_curve, explained_variance, available_features } = data;

  // Group PCA scatter points by cluster label
  const clusterScatterGroups: Record<string, any[]> = {};
  (pca_points || []).forEach((p: any) => {
    const label = p.segment_label;
    if (!clusterScatterGroups[label]) clusterScatterGroups[label] = [];
    clusterScatterGroups[label].push({
      x: p.x,
      y: p.y,
      name: p.name,
      cluster_id: p.cluster_id,
      color: p.color,
    });
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cohort & Segment Discovery</h1>
          <p className="text-sm text-white/60 mt-1">
            Unsupervised K-Means clustering with automated feature scaling, 2D PCA projection, and elbow discovery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
            <Sliders className="w-3.5 h-3.5 text-white/60" />
            <span className="text-xs text-white/70">Clusters (k):</span>
            <select
              value={clusterCount}
              onChange={(e) => {
                const k = Number(e.target.value);
                setClusterCount(k);
                loadSegments(k);
              }}
              disabled={isUpdating}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num} className="bg-slate-900 text-white">
                  {num} Clusters
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => loadSegments(clusterCount)}
            disabled={isUpdating}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Re-run clustering"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Cluster Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {segments?.map((seg: any) => {
          const isSelected = selectedCluster === seg.cluster_id;
          return (
            <button
              key={seg.cluster_id}
              onClick={() => setSelectedCluster(isSelected ? null : seg.cluster_id)}
              className={`glass-card p-5 rounded-2xl text-left transition-all border ${
                isSelected ? "border-[hsl(var(--brand-primary))] ring-1 ring-[hsl(var(--brand-primary))]" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${seg.color}25`, color: seg.color }}
                >
                  {seg.segment_label}
                </span>
                <span className="text-xs text-white/50">{seg.percentage}%</span>
              </div>
              <p className="text-2xl font-bold text-white mb-0.5">{(seg.count || 0).toLocaleString()}</p>
              <p className="text-xs text-white/40">records in cohort</p>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
                />
              </div>

              {/* Sample feature averages */}
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                {Object.entries(seg.feature_means || {})
                  .slice(0, 2)
                  .map(([f, val]: any) => (
                    <div key={f} className="flex justify-between text-[11px] text-white/60">
                      <span className="truncate max-w-[110px] capitalize">{f.replace("_", " ")}:</span>
                      <span className="font-mono text-white/80">{val}</span>
                    </div>
                  ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Visualizations Grid: PCA 2D Scatter + Elbow Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PCA 2D Scatter */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">PCA 2D Cluster Projection</h3>
            <p className="text-xs text-white/50">
              Principal Component Analysis 2D coordinate reduction (PC1: {explained_variance?.[0] || 0}%, PC2: {explained_variance?.[1] || 0}% variance explained)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="x" name="PC1" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
              <YAxis dataKey="y" name="PC2" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
              <ZAxis range={[30, 30]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const pt = payload[0].payload;
                    return (
                      <div className="glass-card p-2.5 rounded-lg text-xs shadow-xl border border-white/20">
                        <p className="font-semibold text-white">{pt.name}</p>
                        <p className="text-white/60 font-mono text-[10px]">
                          PC1: {pt.x?.toFixed(2)} • PC2: {pt.y?.toFixed(2)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }} />
              {Object.entries(clusterScatterGroups).map(([label, pts]) => {
                const cId = pts[0]?.cluster_id;
                const isFaded = selectedCluster !== null && selectedCluster !== cId;
                return (
                  <Scatter
                    key={label}
                    name={label}
                    data={pts}
                    fill={pts[0]?.color || "#8B5CF6"}
                    opacity={isFaded ? 0.15 : 0.75}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Elbow Curve */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Elbow & Silhouette Curve</h3>
            <p className="text-xs text-white/50 mt-0.5">Optimal k cluster discovery via inertia minimization.</p>
          </div>
          <div className="py-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={elbow_curve || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="k" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="glass-card p-2 rounded text-xs border border-white/20">
                          <p className="font-semibold text-white">k = {d.k}</p>
                          <p className="text-white/60">Inertia: {d.inertia}</p>
                          <p className="text-white/60">Silhouette: {d.silhouette}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="inertia" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-white/40 text-center">
            Higher silhouette scores indicate more distinct, isolated cohorts.
          </p>
        </div>
      </div>

      {/* Cluster Feature Comparison Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Cluster Feature Profile Matrix</h3>
          <p className="text-xs text-white/50 mt-0.5">
            Mean values of active continuous variables across each discovered cohort.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/70">
            <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-semibold border-b border-white/10 text-[10px]">
              <tr>
                <th className="px-4 py-3">Cohort Label</th>
                <th className="px-4 py-3 text-right">Population</th>
                <th className="px-4 py-3 text-right">Share</th>
                {available_features?.map((f: string) => (
                  <th key={f} className="px-4 py-3 text-right capitalize truncate max-w-[120px]">
                    Avg {f.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {segments?.map((seg: any) => (
                <tr key={seg.cluster_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-white">{seg.segment_label}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">{(seg.count || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-white/60">{seg.percentage}%</td>
                  {available_features?.map((f: string) => (
                    <td key={f} className="px-4 py-3 text-right font-mono text-white/80">
                      {seg.feature_means?.[f] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

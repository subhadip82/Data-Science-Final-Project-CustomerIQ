"use client";
import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { rfmApi } from "@/lib/api/client";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { SegmentBadge } from "@/components/shared/Badges";
import { NoDatasetState, ErrorState, PageSkeleton, ModuleUnavailableState } from "@/components/shared/States";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SEGMENTS = ["", "VIP Customers", "Loyal Customers", "Potential Customers", "At-Risk Customers"];
const PAGE_SIZE = 25;

export default function RFMPage() {
  const { withToken } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (segment) params.segment = segment;
    withToken((t) => rfmApi.get(t, params))
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [page, segment]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data?.has_dataset) return <NoDatasetState />;
  if (data?.available === false) {
    return (
      <ModuleUnavailableState
        moduleName="RFM Analysis"
        reason={data.reason || "RFM analysis is unavailable for this dataset because required transaction and customer fields were not detected."}
        requiredFields={data.missing_fields || ["Customer Identifier", "Transaction Date", "Monetary Spend / Total Price"]}
      />
    );
  }
  if (!data?.customers?.length && !segment) return <NoDatasetState />;

  const customers = data?.customers || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const rColors = ["#EF4444","#F97316","#EAB308","#22C55E","#10B981"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">RFM Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">Recency · Frequency · Monetary segmentation scores</p>
      </div>

      {/* Score Distribution Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard title="Recency Score Distribution" minHeight="200px">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.recency_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {(data.recency_distribution || []).map((_: any, i: number) => (
                    <Cell key={i} fill={rColors[i % rColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Frequency Score Distribution" minHeight="200px">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.frequency_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Monetary Distribution" minHeight="200px">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monetary_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [v, "Customers"]} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Filter + Table */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <select
          value={segment}
          onChange={(e) => { setSegment(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {SEGMENTS.map((s) => <option key={s} value={s}>{s || "All Segments"}</option>)}
        </select>
        <p className="text-sm text-muted-foreground">{total.toLocaleString("en-IN")} customers</p>
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                {["Customer", "Country", "Recency (days)", "Frequency", "Monetary", "R", "F", "M", "RFM Score", "Segment"].map(h => (
                  <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>{Array.from({length: 10}).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}</tr>
                ))
                : customers.map((c: any) => (
                  <tr key={c.customer_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{c.name || c.customer_code}</p>
                        <p className="text-xs text-muted-foreground">{c.customer_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.country || "—"}</td>
                    <td className="px-4 py-3 text-sm">{c.recency_days ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{c.frequency ?? "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium">{c.monetary != null ? formatCurrency(c.monetary) : "—"}</td>
                    <td className="px-4 py-3 text-center"><span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">{c.r_score}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">{c.f_score}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">{c.m_score}</span></td>
                    <td className="px-4 py-3 text-sm font-mono font-bold">{c.rfm_score ?? "—"}</td>
                    <td className="px-4 py-3">{c.segment_label ? <SegmentBadge segment={c.segment_label} size="sm" /> : "—"}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { customersApi } from "@/lib/api/client";
import { SegmentBadge } from "@/components/shared/Badges";
import { NoDatasetState, ErrorState, ModuleUnavailableState } from "@/components/shared/States";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";

const SEGMENTS = ["", "VIP Customers", "Loyal Customers", "Potential Customers", "At-Risk Customers"];

export default function CustomersPage() {
  const { withToken } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (search) params.search = search;
    if (segment) params.segment = segment;
    withToken((t) => customersApi.list(t, params))
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, segment]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!loading && !data?.has_dataset) return <NoDatasetState />;
  if (!loading && data?.available === false) {
    return (
      <ModuleUnavailableState
        moduleName="Customer / Entity Directory"
        reason={data.reason || "Customer directory is unavailable because no entity or customer identifier was detected in this dataset."}
        requiredFields={["Customer ID / Entity Identifier (e.g. CustomerID, UserID, EmployeeID)"]}
      />
    );
  }

  const customers = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString("en-IN")} customers in workspace</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name or code..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </form>
        <select
          value={segment}
          onChange={(e) => { setSegment(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>{s || "All Segments"}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !loading && customers.length === 0 ? (
        <NoDatasetState />
      ) : (
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  {["Customer", "Country", "Orders", "Revenue", "RFM Score", "Segment"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6].map((j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="skeleton h-4 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : customers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/app/customers/${c.id}`} className="group block">
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{c.name || c.customer_code}</p>
                          <p className="text-xs text-muted-foreground">{c.customer_code}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.country || "—"}</td>
                      <td className="px-4 py-3 text-sm">{c.total_orders?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{c.total_revenue != null ? formatCurrency(c.total_revenue) : "—"}</td>
                      <td className="px-4 py-3 text-sm font-mono">{c.rfm_score ?? "—"}</td>
                      <td className="px-4 py-3">
                        {c.segment_label ? <SegmentBadge segment={c.segment_label} size="sm" /> : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString("en-IN")}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

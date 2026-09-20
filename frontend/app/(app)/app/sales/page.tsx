"use client";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { salesApi } from "@/lib/api/client";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { KPICard } from "@/components/dashboard/KPICard";
import { NoDatasetState, ErrorState, PageSkeleton, ModuleUnavailableState } from "@/components/shared/States";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Package } from "lucide-react";

export default function SalesPage() {
  const { withToken } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    withToken((t) => salesApi.get(t))
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data?.has_dataset) return <NoDatasetState />;
  if (data?.available === false) {
    return (
      <ModuleUnavailableState
        moduleName="Sales Analytics"
        reason={data.reason || "Sales analytics is unavailable for this dataset because no revenue or monetary measure columns were detected."}
        requiredFields={["Total Revenue / Sales", "Transaction Amount / Price"]}
      />
    );
  }
  if (!data || !data.total_orders) return <NoDatasetState />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Sales Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Revenue performance, top products, and geographic breakdown</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={data.total_revenue} isCurrency change={data.growth_rate} icon={<DollarSign className="w-5 h-5 text-white" />} />
        <KPICard title="Total Orders" value={data.total_orders} icon={<ShoppingCart className="w-5 h-5 text-white" />} />
        <KPICard title="Avg Order Value" value={data.avg_order_value} isCurrency icon={<TrendingUp className="w-5 h-5 text-white" />} />
        <KPICard title="Products Tracked" value={data.top_products?.length ?? 0} icon={<Package className="w-5 h-5 text-white" />} />
      </div>

      {/* Monthly Sales */}
      <ChartCard title="Monthly Sales Trend" description="Revenue and order count by month" minHeight="280px">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.monthly_sales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any, n: any) => [n === "revenue" ? formatCurrency(Number(v || 0)) : Number(v || 0).toLocaleString(), n === "revenue" ? "Revenue" : "Orders"]} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#salesGrad)" name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <ChartCard title="Top 10 Products" minHeight="280px">
          <div className="space-y-3">
            {(data.top_products || []).slice(0, 10).map((p: any, i: number) => {
              const max = data.top_products[0]?.revenue || 1;
              return (
                <div key={p.product}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[60%]">{p.product}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-primary transition-all"
                      style={{ width: `${(p.revenue / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Country Sales */}
        <ChartCard title="Sales by Country" minHeight="280px">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.country_sales} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: any) => [formatCurrency(Number(v || 0)), "Revenue"]} />
              <Bar dataKey="revenue" fill="#F59E0B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

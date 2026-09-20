"use client";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { analyticsApi } from "@/lib/api/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { PageSkeleton, NoDatasetState, ErrorState } from "@/components/shared/States";
import { getSegmentColor } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { DollarSign, ShoppingCart, UserCheck, Percent } from "lucide-react";

export default function AnalyticsPage() {
  const { withToken } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    withToken((t) => analyticsApi.full(t))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data || !data.summary) return <NoDatasetState />;

  const { summary, revenue_trend, country_revenue, top_products, segment_distribution } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">End-to-end business performance overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={summary.total_revenue} change={summary.revenue_change_pct} isCurrency icon={<DollarSign className="w-5 h-5 text-white" />} />
        <KPICard title="Total Orders" value={summary.total_orders} change={summary.orders_change_pct} icon={<ShoppingCart className="w-5 h-5 text-white" />} />
        <KPICard title="Customers" value={summary.total_customers} change={summary.customers_change_pct} icon={<UserCheck className="w-5 h-5 text-white" />} />
        <KPICard title="Avg Order Value" value={summary.avg_order_value} isCurrency icon={<Percent className="w-5 h-5 text-white" />} />
      </div>

      {/* Revenue trend */}
      <ChartCard title="Revenue Trend" description="Monthly revenue over last 12 months" minHeight="280px">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenue_trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString("en-IN")}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <ChartCard title="Top Products by Revenue" minHeight="280px">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top_products} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="product" tick={{ fontSize: 10 }} width={130} />
              <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString("en-IN")}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#7C3AED" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Segment Distribution */}
        <ChartCard title="Customer Segment Distribution" minHeight="280px">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={segment_distribution}
                dataKey="count"
                nameKey="segment_label"
                cx="50%" cy="50%"
                outerRadius={100}
                label={({ segment_label, percent }: any) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(segment_distribution || []).map((entry: any, index: number) => (
                  <Cell key={index} fill={getSegmentColor(entry.segment_label)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Country Revenue */}
      <ChartCard title="Revenue by Country" minHeight="240px">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={country_revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="country" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => [`₹${Number(v || 0).toLocaleString("en-IN")}`, "Revenue"]} />
            <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

"use client";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/hooks/useApi";
import { analyticsApi } from "@/lib/api/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart2, Users, PieChart, TrendingUp, Lightbulb, Star,
  Upload, FileText, Bell, Settings, Activity, ArrowRight,
  DollarSign, ShoppingCart, UserCheck, Percent, Database, Layers, Sparkles
} from "lucide-react";

const modules = [
  { href: "/app/features", label: "Features", desc: "Automated feature importance & key drivers", icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10" },
  { href: "/app/data-profile", label: "Data Profile", desc: "Data quality score & column statistics", icon: Database, color: "text-blue-400", bg: "bg-blue-500/10" },
  { href: "/app/datasets", label: "Datasets", desc: "Manage and switch active datasets", icon: Layers, color: "text-purple-400", bg: "bg-purple-500/10" },
  { href: "/app/analytics", label: "Analytics", desc: "Revenue, orders, customer trends", icon: BarChart2, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { href: "/app/customers", label: "Customers", desc: "Browse and search entity profiles", icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { href: "/app/segments", label: "Segmentation", desc: "K-Means cluster & PCA analysis", icon: PieChart, color: "text-pink-400", bg: "bg-pink-500/10" },
  { href: "/app/rfm", label: "RFM Analysis", desc: "Recency, Frequency, Monetary quintiles", icon: Activity, color: "text-teal-400", bg: "bg-teal-500/10" },
  { href: "/app/sales", label: "Sales Analytics", desc: "Revenue trends & product metrics", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { href: "/app/insights", label: "Insights", desc: "Mathematical business intelligence", icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/10" },
  { href: "/app/recommendations", label: "Recommendations", desc: "Data-grounded action playbooks", icon: Star, color: "text-orange-400", bg: "bg-orange-500/10" },
  { href: "/app/upload", label: "Upload Data", desc: "Import CSV or XLSX with auto-profiling", icon: Upload, color: "text-rose-400", bg: "bg-rose-500/10" },
  { href: "/app/reports", label: "Reports", desc: "Generated analytical summaries", icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10" },
  { href: "/app/settings", label: "Settings", desc: "Profile, storage & appearance", icon: Settings, color: "text-slate-400", bg: "bg-slate-500/10" },
];

import { ShareAnalysisModal } from "@/components/shared/ShareAnalysisModal";
import { Share2 } from "lucide-react";

export default function AppHomePage() {
  const { user } = useUser();
  const { request } = useApi();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    request((token) => analyticsApi.summary(token))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";

  const kpiList = summary?.kpis && summary.kpis.length > 0 ? summary.kpis : [
    { label: "Total Revenue", value: summary?.total_revenue ?? 0, is_currency: true },
    { label: "Total Orders", value: summary?.total_orders ?? 0 },
    { label: "Active Entities", value: summary?.total_customers ?? 0 },
    { label: "Repeat Rate", value: summary?.repeat_customer_rate ?? 0, suffix: "%" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary?.has_dataset
              ? `Active Dataset: ${summary.dataset_name} (${summary.dataset_type?.toUpperCase()})`
              : "Welcome to CustomerIQ. Upload a structured tabular dataset to get started."}
          </p>
        </div>
        {summary?.has_dataset && (
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Share dashboard by email or secure link"
            >
              <Share2 className="w-3.5 h-3.5 text-primary" /> Share Analysis
            </button>
            <Link
              href="/app/data-profile"
              className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow"
            >
              <Database className="w-3.5 h-3.5" /> View Data Quality
            </Link>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareAnalysisModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        datasetName={summary?.dataset_name || "Active Analysis"}
      />

      {/* Dynamic KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiList.map((kpi: any, idx: number) => (
          <KPICard
            key={idx}
            title={kpi.label}
            value={kpi.value}
            change={kpi.change_pct}
            isCurrency={kpi.is_currency}
            suffix={kpi.suffix}
            loading={loading}
            icon={<BarChart2 className="w-5 h-5 text-white" />}
          />
        ))}
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-base font-semibold mb-4 text-white">Platform Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="card-base card-hover p-4 flex items-start gap-3 group animate-fade-in-up"
              >
                <div className={`w-10 h-10 rounded-xl ${mod.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${mod.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors text-white">{mod.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick info row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4 text-white">Ingestion & Analytics Lifecycle</h3>
          <ol className="space-y-3">
            {[
              { step: "1", text: "Upload structured CSV or XLSX dataset", done: !!summary?.has_dataset },
              { step: "2", text: "Automated column profiling & quality check", done: !!summary?.has_dataset },
              { step: "3", text: "Universal K-Means clustering & PCA projection", done: !!summary?.has_dataset },
              { step: "4", text: "Review fact-based insights & action playbooks", done: !!summary?.has_dataset },
            ].map((item) => (
              <li key={item.step} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.done ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground"}`}>
                  {item.done ? "✓" : item.step}
                </span>
                <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "text-white/80"}`}>{item.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4 text-white">Active Dataset Overview</h3>
          <div className="space-y-3">
            {[
              { label: "Active Dataset", value: summary?.dataset_name || "None uploaded" },
              { label: "Detected Domain", value: (summary?.dataset_type || "tabular").toUpperCase() },
              { label: "Total Records Tracked", value: summary?.total_customers?.toLocaleString() ?? "—" },
              { label: "Analytical State", value: summary?.has_dataset ? "Synchronized" : "Awaiting Data" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-semibold text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

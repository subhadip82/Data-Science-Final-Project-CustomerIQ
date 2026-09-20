"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BarChart2, Users, PieChart, TrendingUp,
  Lightbulb, Star, Upload, FileText, Settings,
  ChevronLeft, ChevronRight, Activity, Database, Layers, Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { workspaceApi } from "@/lib/api/client";

const navItems = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/features", label: "Features", icon: Sparkles },
  { href: "/app/data-profile", label: "Data Profile", icon: Database },
  { href: "/app/datasets", label: "Datasets", icon: Layers },
  { href: "/app/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/segments", label: "Segments", icon: PieChart },
  { href: "/app/rfm", label: "RFM Analysis", icon: Activity },
  { href: "/app/sales", label: "Sales", icon: TrendingUp },
  { href: "/app/insights", label: "Insights", icon: Lightbulb },
  { href: "/app/recommendations", label: "Recommendations", icon: Star },
  { href: "/app/upload", label: "Upload Data", icon: Upload },
  { href: "/app/reports", label: "Reports", icon: FileText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AppSidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { request } = useApi();
  const [storage, setStorage] = useState<{
    used_mb: number;
    quota_mb: number;
    used_pct: number;
    status_text: string;
  }>({
    used_mb: 0,
    quota_mb: 100,
    used_pct: 0,
    status_text: "0 MB of 100 MB used",
  });

  useEffect(() => {
    let mounted = true;
    request((token) => workspaceApi.getStorage(token))
      .then((data) => {
        if (mounted && data) {
          setStorage(data);
        }
      })
      .catch(() => {
        // Fallback gracefully without breaking UI
      });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  return (
    <aside
      className={cn(
        "flex flex-col h-full transition-all duration-300",
        "bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[hsl(var(--sidebar-border))] shrink-0">
        {!collapsed && (
          <Link href="/app" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">CustomerIQ</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center mx-auto">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors",
            collapsed && "mx-auto mt-2"
          )}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-[hsl(var(--brand-primary)/0.15)] text-[hsl(var(--brand-primary))] border-r-2 border-[hsl(var(--brand-primary))]"
                  : "text-white/60 hover:text-white hover:bg-white/8",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("shrink-0", isActive ? "w-4 h-4" : "w-4 h-4")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom - Dynamic Real Storage */}
      {!collapsed && (
        <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/60">Storage</p>
              <span className="text-[10px] text-white/40">{storage.used_pct}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-500"
                style={{ width: `${Math.max(storage.used_pct, 2)}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-1.5">{storage.status_text}</p>
          </div>
        </div>
      )}
    </aside>
  );
}

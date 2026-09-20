import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function getSegmentColor(segment: string): string {
  const map: Record<string, string> = {
    "VIP Customers": "#8B5CF6",
    "Loyal Customers": "#3B82F6",
    "Potential Customers": "#10B981",
    "At-Risk Customers": "#EF4444",
  };
  return map[segment] || "#6B7280";
}

export function getSegmentBg(segment: string): string {
  const map: Record<string, string> = {
    "VIP Customers": "rgba(139,92,246,0.1)",
    "Loyal Customers": "rgba(59,130,246,0.1)",
    "Potential Customers": "rgba(16,185,129,0.1)",
    "At-Risk Customers": "rgba(239,68,68,0.1)",
  };
  return map[segment] || "rgba(107,114,128,0.1)";
}

export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export const formatRelativeTime = timeAgo;


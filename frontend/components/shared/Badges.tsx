import { cn, getSegmentColor, getSegmentBg } from "@/lib/utils";

interface SegmentBadgeProps {
  segment: string;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentBadge({ segment, size = "md", className }: SegmentBadgeProps) {
  const color = getSegmentColor(segment);
  const bg = getSegmentBg(segment);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className
      )}
      style={{ color, backgroundColor: bg, borderColor: `${color}30` }}
    >
      {segment}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, { color: string; bg: string }> = {
  active:      { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  inactive:    { color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
  completed:   { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  pending:     { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  processing:  { color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  failed:      { color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  generating:  { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { color, bg } = statusColors[status.toLowerCase()] ?? statusColors.inactive;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border", className)}
      style={{ color, backgroundColor: bg, borderColor: `${color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface NotificationTypeBadgeProps {
  type: string;
}

const typeColors: Record<string, { color: string; bg: string }> = {
  success: { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  warning: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  error:   { color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  info:    { color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
};

export function NotificationTypeBadge({ type }: NotificationTypeBadgeProps) {
  const { color, bg } = typeColors[type] ?? typeColors.info;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {type}
    </span>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  FileText,
  AlertCircle,
  Info,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { notificationsApi, NotificationItem } from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

interface NotificationPopoverProps {
  className?: string;
}

export function NotificationPopover({ className }: NotificationPopoverProps) {
  const router = useRouter();
  const { withToken } = useApi();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unread count & initial list
  const fetchUnread = useCallback(async () => {
    try {
      const data = await withToken((token) => notificationsApi.unreadCount(token));
      if (data && typeof data.unread_count === "number") {
        setUnreadCount(data.unread_count);
      }
    } catch {
      // Fail silently for background polling
    }
  }, [withToken]);

  // Fetch latest notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withToken((token) => notificationsApi.list(token, 8));
      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count ?? 0);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [withToken]);

  // Initial load and periodic polling every 25 seconds
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUnread();
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // When popover opens, fetch fresh list
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Handle click outside and Escape key to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      // Call API
      withToken((token) => notificationsApi.markRead(token, item.id)).catch(() => {});
    }

    // If target route exists, close popover and navigate
    if (item.target_route) {
      setIsOpen(false);
      router.push(item.target_route);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await withToken((token) => notificationsApi.markAllRead(token));
    } catch {
      // Ignored
    }
  };

  // Helper to pick icon by notification type/severity
  const renderIcon = (type: string, severity?: string) => {
    const s = severity || type;
    switch (s) {
      case "dataset_completed":
      case "success":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4" />
          </div>
        );
      case "data_quality_warning":
      case "warning":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case "model_completed":
      case "insight_generated":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-purple-500/15 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case "report_generated":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500/15 text-blue-400 border border-blue-500/20">
            <FileText className="w-4 h-4" />
          </div>
        );
      case "error":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-rose-500/15 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/15 text-primary border border-primary/20">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Notifications"
        className={cn(
          "relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150",
          "text-muted-foreground hover:text-foreground hover:bg-accent/80 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isOpen && "bg-accent text-foreground shadow-sm"
        )}
      >
        <Bell className={cn("w-4 h-4 transition-transform duration-200", isOpen && "scale-110 text-primary")} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-violet-500/50 animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications Panel"
          className={cn(
            "fixed sm:absolute right-4 sm:right-0 top-16 sm:top-full sm:mt-2 z-50",
            "w-[calc(100vw-2rem)] sm:w-[380px] max-w-[400px]",
            "bg-card/95 backdrop-blur-xl border border-border/70 rounded-2xl shadow-2xl overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-150 ease-out"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 active:scale-95"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40 overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              /* Empty State */
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground mb-3 shadow-inner">
                  <Bell className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-sm font-semibold text-foreground">No new notifications</p>
                <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    "group flex items-start gap-3 p-3.5 transition-all duration-150 cursor-pointer select-none",
                    item.is_read
                      ? "hover:bg-muted/40 opacity-75 hover:opacity-100"
                      : "bg-primary/[0.04] hover:bg-primary/[0.08] border-l-2 border-l-primary"
                  )}
                >
                  {/* Visual Status Icon */}
                  {renderIcon(item.type, item.severity)}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs leading-snug line-clamp-1",
                          item.is_read ? "font-medium text-foreground/90" : "font-semibold text-foreground"
                        )}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground/90 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.target_route && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium mt-1 group-hover:underline">
                        View details
                        <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Unread indicator dot */}
                  {!item.is_read && (
                    <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1 shadow-sm shadow-violet-500/50" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/50 bg-muted/30 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/app/reports");
              }}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              View recent activity & reports
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

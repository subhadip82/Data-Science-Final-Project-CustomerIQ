"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useApi } from "@/lib/hooks/useApi";
import { authApi } from "@/lib/api/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopNav } from "@/components/layout/AppTopNav";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();
  const { withToken } = useApi();

  useEffect(() => {
    if (user) {
      withToken((token) =>
        authApi.sync(
          {
            clerk_user_id: user.id,
            email: user.primaryEmailAddress?.emailAddress || `${user.id}@customeriq.app`,
            full_name: user.fullName || undefined,
            avatar_url: user.imageUrl || undefined,
          },
          token
        )
      ).catch(() => {});
    }
  }, [user, withToken]);

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto flex-shrink-0 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopNav
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

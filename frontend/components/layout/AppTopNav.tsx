"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { NotificationPopover } from "@/components/layout/NotificationPopover";
import { DatasetSwitcher } from "@/components/layout/DatasetSwitcher";
import { cn } from "@/lib/utils";

interface AppTopNavProps {
  onMenuToggle: () => void;
  pageTitle?: string;
}

export function AppTopNav({ onMenuToggle, pageTitle }: AppTopNavProps) {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 border-b border-border/70 bg-background/80 backdrop-blur-md shrink-0 sticky top-0 z-40">
      {/* Left: Mobile Menu, Page Title, and Active Dataset Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {pageTitle && (
          <h1 className="text-base font-semibold tracking-tight text-foreground hidden sm:block">
            {pageTitle}
          </h1>
        )}

        {/* Global Active Dataset Switcher */}
        <DatasetSwitcher />
      </div>

      {/* Right: Search, Theme Toggle, Notification Popover, and User Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Shortcut */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border/50 text-xs text-muted-foreground hover:border-border transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium">Search modules...</span>
          <kbd className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded border border-border/70 font-mono">⌘K</kbd>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {mounted ? (
            theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        {/* Modern SaaS Notification Popover */}
        <NotificationPopover />

        {/* Separator */}
        <div className="h-4 w-[1px] bg-border/60 mx-0.5" />

        {/* User Profile Avatar / Dropdown */}
        <div className="flex items-center">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}

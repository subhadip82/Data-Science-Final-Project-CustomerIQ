"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useApi } from "@/lib/hooks/useApi";
import { workspaceApi } from "@/lib/api/client";
import { Sun, Moon, User, Building2, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const { request } = useApi();
  const [storage, setStorage] = useState<any>(null);

  useEffect(() => {
    request((t) => workspaceApi.getStorage(t)).then(setStorage).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><User className="w-4 h-4" /> Profile</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {user?.imageUrl && (
              <img src={user.imageUrl} alt={user.fullName ?? ""} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30" />
            )}
            <div>
              <p className="font-semibold">{user?.fullName}</p>
              <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <a
            href="https://accounts.clerk.dev/user"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Manage account on Clerk →
          </a>
        </div>
      </div>

      {/* Appearance */}
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Sun className="w-4 h-4" /> Appearance</h2>
        <div className="flex gap-3">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${theme === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
            >
              {t === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {t.charAt(0).toUpperCase() + t.slice(1)} Mode
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Building2 className="w-4 h-4" /> Workspace</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-semibold text-purple-400">Pro Tier</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-semibold">{storage?.status_text || "Calculated from files"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">ML Pipeline</span>
            <span className="font-semibold text-emerald-400">Universal Scikit-Learn Engine Active</span>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="card-base p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3"><Shield className="w-4 h-4" /> Privacy & Security</h2>
        <p className="text-sm text-muted-foreground">
          All data is isolated to your workspace. Authentication is managed by Clerk with JWT validation.
          Data is encrypted at rest and in transit.
        </p>
      </div>
    </div>
  );
}

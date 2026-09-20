"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Database, ChevronDown, Check, Upload, Layers, RefreshCw } from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { datasetsApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export function DatasetSwitcher() {
  const router = useRouter();
  const { request } = useApi();
  const [open, setOpen] = useState(false);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [activeDataset, setActiveDataset] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchActiveAndList = async () => {
    try {
      const activeRes = await request((token) => datasetsApi.getActive(token));
      if (activeRes?.has_active && activeRes.dataset) {
        setActiveDataset(activeRes.dataset);
      } else {
        setActiveDataset(null);
      }

      const listRes = await request((token) => datasetsApi.list(token));
      setDatasets(listRes?.items || []);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchActiveAndList();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (datasetId: string) => {
    if (activeDataset?.id === datasetId) {
      setOpen(false);
      return;
    }
    setSwitchingId(datasetId);
    try {
      await request((token) => datasetsApi.activate(token, datasetId));
      await fetchActiveAndList();
      setOpen(false);
      router.refresh();
      // Reload page state for active dataset
      window.location.reload();
    } catch (err: any) {
      alert("Failed to switch dataset: " + err.message);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
          activeDataset
            ? "bg-primary/10 border-primary/30 text-foreground hover:bg-primary/15"
            : "bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground"
        )}
        title="Current Active Dataset"
      >
        <Database className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="hidden md:inline text-muted-foreground font-normal">Current Dataset:</span>
        <span className="font-semibold text-foreground truncate max-w-[130px] sm:max-w-[200px]">
          {activeDataset ? (activeDataset.filename || activeDataset.name) : "No Dataset Active"}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 glass-card bg-background/95 border border-border/80 rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in divide-y divide-border/50">
          {/* Header */}
          <div className="p-3 bg-muted/20 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Switch Dataset ({datasets.length})
            </span>
            <button
              onClick={fetchActiveAndList}
              className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Dataset List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {datasets.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No datasets uploaded yet.
              </div>
            ) : (
              datasets.map((d) => {
                const isActive = activeDataset?.id === d.id;
                const isSwitching = switchingId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => handleSwitch(d.id)}
                    disabled={isSwitching}
                    className={cn(
                      "w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary font-semibold"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {d.row_count?.toLocaleString() || 0} rows • {d.dataset_type || "tabular"}
                      </p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="p-2 bg-muted/10 flex items-center justify-between gap-2 text-xs">
            <Link
              href="/app/upload"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3 h-3" /> Upload New
            </Link>
            <Link
              href="/app/datasets"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors flex items-center gap-1"
            >
              <Layers className="w-3 h-3" /> Manage All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useApi } from "@/lib/hooks/useApi";
import { datasetsApi } from "@/lib/api/client";
import {
  Layers, Upload, CheckCircle2, Trash2, Edit3,
  RefreshCw, FileSpreadsheet, ArrowRight, ShieldCheck,
  Search, Play, Share2, Download, AlertTriangle, X
} from "lucide-react";
import Link from "next/link";
import { ShareAnalysisModal } from "@/components/shared/ShareAnalysisModal";
import { AnalysisProgressModal } from "@/components/upload/AnalysisProgressModal";
import { cn } from "@/lib/utils";

export default function DatasetsPage() {
  const { request } = useApi();
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share modal state
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);

  // Analysis progress modal state
  const [analyzingTarget, setAnalyzingTarget] = useState<{ id: string; name: string } | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request((token) => datasetsApi.list(token));
      setDatasets(res?.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets;
    const q = searchQuery.toLowerCase();
    return datasets.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.filename?.toLowerCase().includes(q) ||
        d.dataset_type?.toLowerCase().includes(q)
    );
  }, [datasets, searchQuery]);

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      await request((token) => datasetsApi.activate(token, id));
      await fetchDatasets();
    } catch (err: any) {
      alert("Failed to switch dataset: " + err.message);
    } finally {
      setActivatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await request((token) => datasetsApi.delete(token, deleteTarget.id));
      setDeleteTarget(null);
      await fetchDatasets();
    } catch (err: any) {
      alert("Failed to delete dataset: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!newName.trim()) return;
    try {
      await request((token) => datasetsApi.rename(token, id, newName.trim()));
      setRenamingId(null);
      setNewName("");
      await fetchDatasets();
    } catch (err: any) {
      alert("Failed to rename dataset: " + err.message);
    }
  };

  const handleStartAnalysis = async (id: string, name: string) => {
    setAnalyzingTarget({ id, name });
    setAnalysisComplete(false);
    setAnalysisError(null);
    try {
      await request((token) => datasetsApi.analyze(token, id));
      setAnalysisComplete(true);
      await fetchDatasets();
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to run analysis.");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "ready").toLowerCase();
    if (s === "completed" || s === "ready") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
          Ready
        </span>
      );
    }
    if (s === "analyzing" || s === "processing") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 animate-pulse">
          Analyzing
        </span>
      );
    }
    if (s === "failed") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30">
          Failed
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dataset Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse workspace datasets, switch the active dataset, launch universal analysis, and share reports securely.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDatasets}
            className="px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium border border-border/80 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/app/upload"
            className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Dataset
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search datasets by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-muted/30 border border-border text-foreground text-xs placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {filteredDatasets.length} of {datasets.length} datasets
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl flex flex-col items-center justify-center border border-border/60">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {datasets.length === 0 ? "No Datasets In Workspace" : "No Matching Datasets Found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {datasets.length === 0
              ? "Upload CSV or XLSX datasets to begin exploring analytics, clustering, and automated machine learning."
              : "Try adjusting your search keywords or clear the filter."}
          </p>
          {datasets.length === 0 && (
            <Link
              href="/app/upload"
              className="px-5 py-2.5 rounded-2xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
            >
              <Upload className="w-4 h-4" /> Upload First Dataset
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDatasets.map((d) => {
            const isActive = d.is_active;
            return (
              <div
                key={d.id}
                className={cn(
                  "glass-card p-5 rounded-3xl transition-all border",
                  isActive
                    ? "border-primary/50 bg-primary/5 shadow-md"
                    : "border-border/70 hover:border-border"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        isActive ? "gradient-primary text-white" : "bg-muted/60 text-muted-foreground border border-border"
                      )}
                    >
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      {renamingId === d.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="px-3 py-1 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRename(d.id)}
                            className="px-3 py-1 rounded-xl bg-primary text-white text-xs font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setRenamingId(null)}
                            className="px-2 py-1 rounded-xl bg-muted text-muted-foreground text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-foreground">{d.name}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                          {getStatusBadge(d.status)}
                          <button
                            onClick={() => {
                              setRenamingId(d.id);
                              setNewName(d.name);
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Rename dataset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {d.filename} • <span className="uppercase font-semibold">{d.file_type}</span> • {d.row_count?.toLocaleString()} rows • {d.column_count} columns
                        {d.file_size && ` • ${(d.file_size / 1024).toFixed(1)} KB`}
                      </p>

                      <div className="flex items-center gap-3 pt-1 flex-wrap text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-[11px] font-medium capitalize">
                          Domain: {d.dataset_type || "Generic Tabular"}
                        </span>
                        {d.quality_score && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            Quality: <strong className="text-foreground">{d.quality_score}/100</strong>
                          </span>
                        )}
                        {d.uploaded_at && (
                          <span className="text-[11px] text-muted-foreground">
                            Uploaded: {new Date(d.uploaded_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 flex-wrap self-end lg:self-center pt-2 lg:pt-0">
                    {!isActive ? (
                      <button
                        onClick={() => handleActivate(d.id)}
                        disabled={activatingId === d.id}
                        className="px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold border border-border transition-colors"
                      >
                        {activatingId === d.id ? "Switching..." : "Set as Active"}
                      </button>
                    ) : (
                      <Link
                        href="/app/data-profile"
                        className="px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        View Profile <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}

                    {/* Run Analysis Action */}
                    <button
                      onClick={() => handleStartAnalysis(d.id, d.name)}
                      className="px-3.5 py-2 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Run full analysis engine"
                    >
                      <Play className="w-3 h-3 fill-current" /> Analyze
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() => setShareTarget({ id: d.id, name: d.name })}
                      className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
                      title="Share analysis report"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Download File */}
                    <button
                      onClick={async () => {
                        try {
                          await request((token) => datasetsApi.downloadFile(token, d.id, d.filename || `${d.name}.csv`));
                        } catch (err: any) {
                          alert("Download failed: " + err.message);
                        }
                      }}
                      className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors inline-flex items-center justify-center"
                      title="Download original raw file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Dataset */}
                    <button
                      onClick={() => setDeleteTarget({ id: d.id, name: d.name })}
                      className="p-2 rounded-xl bg-muted/50 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-500 border border-border transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal (Requirement 25) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-card bg-background/95 border border-border/80 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Dataset?</h3>
                <p className="text-xs text-muted-foreground">{deleteTarget.name}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed space-y-1">
              <p className="font-semibold">This action cannot be undone.</p>
              <p>This will permanently remove:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-1">
                <li>Underlying dataset file</li>
                <li>Stored analysis results</li>
                <li>Generated visualizations</li>
                <li>Related reports & insights</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareTarget && (
        <ShareAnalysisModal
          isOpen={true}
          onClose={() => setShareTarget(null)}
          datasetId={shareTarget.id}
          datasetName={shareTarget.name}
        />
      )}

      {/* Analysis Progress UI */}
      {analyzingTarget && (
        <AnalysisProgressModal
          isOpen={true}
          datasetName={analyzingTarget.name}
          isComplete={analysisComplete}
          error={analysisError}
          onViewDashboard={() => {
            setAnalyzingTarget(null);
            window.location.href = "/app";
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle,
  CloudUpload, Sparkles, Layers, ShieldCheck, ArrowRight, BarChart2,
  Database, RefreshCw, FileSpreadsheet, Download
} from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { uploadApi, datasetsApi, analysisJobsApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { DatasetAnalysisModal, UploadResultData } from "@/components/upload/DatasetAnalysisModal";
import { AnalysisProgressModal } from "@/components/upload/AnalysisProgressModal";

type UploadState = "idle" | "uploading" | "complete" | "error";

export default function UploadPage() {
  const router = useRouter();
  const { request } = useApi();
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<UploadResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal visibility states
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>("");

  const loadHistory = async () => {
    try {
      const res: any = await request((t) => {
        setAuthToken(t);
        return uploadApi.history(t);
      });
      setHistory(res?.datasets || []);
    } catch {}
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    validateAndSet(f);
  };

  const validateAndSet = (f?: File) => {
    if (!f) return;
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      setError("Please select a valid CSV or XLSX spreadsheet file.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File exceeds 50 MB limit.");
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setState("uploading");
    setProgress("Uploading and running automated data profiling...");

    try {
      const data: any = await request((token) => {
        setAuthToken(token);
        return uploadApi.upload(token, file);
      });
      setResult(data);
      setState("complete");
      setProgress("Ingestion & profiling complete!");
      // Requirement: Immediately after upload, a professional POPUP/MODAL must appear
      setShowAnalysisModal(true);
      loadHistory();
    } catch (e: any) {
      setState("error");
      setError(e.message || "Upload processing failed.");
    }
  };

  const handleSaveOnly = (datasetId: string) => {
    setShowAnalysisModal(false);
    loadHistory();
    router.push("/app/datasets");
  };

  const handleStartAnalysis = async (datasetId: string, config: any) => {
    setShowAnalysisModal(false);
    setShowProgressModal(true);
    setAnalysisCompleted(false);
    setAnalysisError(null);

    try {
      const job: any = await request((token) => {
        setAuthToken(token);
        return analysisJobsApi.create(token, {
          dataset_id: datasetId,
          ...config,
        });
      });
      if (job?.job_id) {
        setActiveJobId(job.job_id);
      }
      loadHistory();
    } catch (err: any) {
      console.warn("Background job dispatch issue, executing direct analysis fallback:", err);
      try {
        await request((token) => datasetsApi.analyze(token, datasetId, config));
        setAnalysisCompleted(true);
        loadHistory();
      } catch (fallbackErr: any) {
        setAnalysisError(fallbackErr.message || err.message || "Analysis execution failed.");
      }
    }
  };

  const handleViewDashboard = () => {
    setShowProgressModal(false);
    router.push("/app");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Upload & Ingest Dataset</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Universal tabular ingestion engine for CSV and XLSX files. Automatically profiles columns, checks data quality, and recommends tailored analytical modules.
        </p>
      </div>

      {/* Upload Success Popup Banner */}
      {state === "complete" && result && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Dataset &ldquo;{result.name}&rdquo; Uploaded Successfully!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {result.row_count?.toLocaleString()} rows &bull; {result.column_count} columns &bull; Quality Score: {result.quality_score}/100
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            <button
              onClick={() => {
                if (result.dataset_id && authToken) {
                  datasetsApi.downloadFile(authToken, result.dataset_id, result.filename || `${result.name}.csv`);
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-border bg-background/90 hover:bg-muted text-xs font-medium text-foreground transition-colors flex items-center gap-1.5 shadow-sm"
              title="Download raw dataset file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Download File
            </button>
            <button
              onClick={() => setShowAnalysisModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Start Analysis
            </button>
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "glass-card p-10 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all",
          dragActive
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border/70 hover:border-primary/50 hover:bg-muted/30",
          file && "border-emerald-500/50 bg-emerald-500/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => validateAndSet(e.target.files?.[0])}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <CloudUpload className="w-8 h-8" />
          </div>

          {file ? (
            <div>
              <p className="font-semibold text-foreground text-base">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(1)} KB • Click or drop another file to replace
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-foreground text-base">Drop your CSV or XLSX file here</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts tabular files up to 50 MB with header row</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {file && state !== "complete" && (
        <div className="flex justify-center">
          <button
            onClick={handleUpload}
            disabled={state === "uploading"}
            className="px-6 py-3 rounded-2xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
          >
            {state === "uploading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Upload & Auto-Profile Dataset
              </>
            )}
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ingestion Success Summary Banner (Re-open modal button) */}
      {state === "complete" && result && (
        <div className="glass-card p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{result.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {result.row_count.toLocaleString()} rows • {result.column_count} columns • {result.dataset_type_label || result.dataset_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAnalysisModal(true)}
                className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shadow"
              >
                <Sparkles className="w-3.5 h-3.5" /> Re-open Analysis Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload History Table */}
      {history.length > 0 && (
        <div className="glass-card rounded-3xl overflow-hidden mt-8 border border-border/60">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Upload History</h3>
            <Link href="/app/datasets" className="text-xs text-primary hover:underline font-medium">
              Manage All Datasets →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border/60 text-[10px]">
                <tr>
                  <th className="px-4 py-3">Dataset Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Rows</th>
                  <th className="px-4 py-3 text-right">Columns</th>
                  <th className="px-4 py-3 text-right">Quality</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-foreground">
                {history.slice(0, 5).map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{d.dataset_type || "tabular"}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.row_count?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.column_count || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-500 font-bold">
                      {d.quality_score ? `${d.quality_score}/100` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dataset Ready for Analysis Modal */}
      <DatasetAnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        data={result}
        token={authToken}
        onSaveOnly={handleSaveOnly}
        onStartAnalysis={handleStartAnalysis}
        onUseExisting={(existingId) => {
          setShowAnalysisModal(false);
          router.push("/app");
        }}
      />

      {/* Analysis Progress UI Modal */}
      <AnalysisProgressModal
        isOpen={showProgressModal}
        datasetName={result?.name || "Uploaded Dataset"}
        jobId={activeJobId}
        token={authToken}
        isComplete={analysisCompleted}
        error={analysisError}
        onViewDashboard={handleViewDashboard}
        onCancel={() => {
          setShowProgressModal(false);
        }}
        onRetry={() => {
          if (result?.dataset_id) {
            handleStartAnalysis(result.dataset_id, {});
          }
        }}
        onCloseBackground={() => {
          setShowProgressModal(false);
          router.push("/app/datasets");
        }}
      />
    </div>
  );
}

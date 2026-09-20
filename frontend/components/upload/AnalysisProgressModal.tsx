"use client";

import { useEffect, useState, useRef } from "react";
import {
  CheckCircle2, Loader2, Circle, Sparkles, BarChart2, ArrowRight,
  XCircle, RotateCcw, Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analysisJobsApi, AnalysisJobStatus } from "@/lib/api/client";

interface Step {
  id: string;
  name: string;
  desc: string;
}

const ANALYSIS_STEPS: Step[] = [
  { id: "validation", name: "File & Memory Validation", desc: "Verifying contiguous memory allocation & zero read-only lock" },
  { id: "schema", name: "Schema & Semantic Detection", desc: "Categorizing numeric, datetime, text, and identifier fields" },
  { id: "quality", name: "Data Quality & Integrity Profiling", desc: "Auditing missingness, cardinality, and outliers" },
  { id: "eda", name: "Exploratory Data Analysis (EDA)", desc: "Computing univariate distributions and descriptive moments" },
  { id: "statistics", name: "Statistical & Correlation Analysis", desc: "Computing Pearson/Spearman matrices and hypothesis tests" },
  { id: "ml", name: "Supervised Machine Learning Benchmark", desc: "Training candidate models & evaluating cross-validation metrics" },
  { id: "visualizations", name: "Dynamic Visualization Generation", desc: "Rendering tailored charts, histograms, and trend series" },
  { id: "insights", name: "Business Insights & Strategic Playbooks", desc: "Synthesizing evidence-based findings and recommendations" },
];

interface AnalysisProgressModalProps {
  isOpen: boolean;
  datasetName: string;
  jobId?: string | null;
  token?: string;
  isComplete: boolean;
  error?: string | null;
  onViewDashboard: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onCloseBackground?: () => void;
}

export function AnalysisProgressModal({
  isOpen,
  datasetName,
  jobId,
  token,
  isComplete: propIsComplete,
  error: propError,
  onViewDashboard,
  onCancel,
  onRetry,
  onCloseBackground,
}: AnalysisProgressModalProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [jobStatus, setJobStatus] = useState<AnalysisJobStatus | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveError = propError || localError || jobStatus?.error;
  const effectiveComplete = propIsComplete || jobStatus?.status === "completed";

  // Polling background job status if jobId and token are provided
  useEffect(() => {
    if (!isOpen || !jobId || !token || effectiveComplete || effectiveError || isCancelled) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const pollJob = async () => {
      try {
        const res = await analysisJobsApi.get(token, jobId);
        setJobStatus(res);

        if (res.status === "completed") {
          setCurrentStepIdx(ANALYSIS_STEPS.length);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else if (res.status === "failed") {
          setLocalError(res.error || "Analysis failed in background job.");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else if (res.status === "cancelled") {
          setIsCancelled(true);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else {
          // Map completed steps count
          const completedCount = (res.completed_steps || []).length;
          setCurrentStepIdx(Math.min(completedCount, ANALYSIS_STEPS.length - 1));
        }
      } catch (err: any) {
        // Soft network retry
      }
    };

    pollJob();
    pollIntervalRef.current = setInterval(pollJob, 1200);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, jobId, token, effectiveComplete, effectiveError, isCancelled]);

  // Fallback simulated progress animation if no backend job ID is supplied
  useEffect(() => {
    if (!isOpen || jobId) return;
    if (effectiveComplete) {
      setCurrentStepIdx(ANALYSIS_STEPS.length);
      return;
    }
    if (effectiveError) return;

    const interval = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [isOpen, jobId, effectiveComplete, effectiveError]);

  const progressPct = effectiveComplete
    ? 100
    : jobStatus
    ? jobStatus.progress
    : Math.min(Math.round(((currentStepIdx + 1) / ANALYSIS_STEPS.length) * 88), 92);

  const handleCancelClick = async () => {
    if (jobId && token) {
      try {
        await analysisJobsApi.cancel(token, jobId);
      } catch {}
    }
    setIsCancelled(true);
    if (onCancel) onCancel();
  };

  const handleRetryClick = async () => {
    setLocalError(null);
    setIsCancelled(false);
    if (jobId && token) {
      try {
        const retried = await analysisJobsApi.retry(token, jobId);
        setJobStatus(retried);
      } catch (e: any) {
        setLocalError(e.message || "Retry failed.");
      }
    }
    if (onRetry) onRetry();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-card bg-background/95 border border-border/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl gradient-primary mx-auto flex items-center justify-center text-white shadow-lg">
            {effectiveComplete ? (
              <CheckCircle2 className="w-6 h-6 text-white" />
            ) : effectiveError ? (
              <XCircle className="w-6 h-6 text-rose-300" />
            ) : (
              <Sparkles className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {effectiveComplete
              ? "Analysis Complete!"
              : effectiveError
              ? "Analysis Encountered an Issue"
              : isCancelled
              ? "Analysis Cancelled"
              : "Analyzing Dataset..."}
          </h2>
          <p className="text-xs text-muted-foreground truncate max-w-md mx-auto">
            {datasetName}
          </p>
          {jobStatus?.current_step && !effectiveComplete && !effectiveError && (
            <p className="text-[11px] text-primary font-medium">
              {jobStatus.current_step}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Analysis Progress</span>
            <span className="text-primary font-mono">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Error notice if failed */}
        {effectiveError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error during analysis:</p>
              <p className="mt-0.5">{effectiveError}</p>
            </div>
          </div>
        )}

        {/* Step list */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {ANALYSIS_STEPS.map((step, idx) => {
            const isDone = effectiveComplete || idx < currentStepIdx;
            const isRunning = !effectiveComplete && idx === currentStepIdx && !effectiveError && !isCancelled;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-all",
                  isDone
                    ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                    : isRunning
                    ? "bg-primary/10 border-primary/40 text-primary shadow-sm"
                    : "bg-muted/10 border-border/30 text-muted-foreground/60"
                )}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isRunning ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs truncate">{step.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action on complete */}
        {effectiveComplete && (
          <div className="pt-2">
            <button
              onClick={onViewDashboard}
              className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <BarChart2 className="w-4 h-4" /> Open Analysis Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action on error */}
        {effectiveError && (
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleRetryClick}
              className="flex-1 py-2.5 rounded-xl gradient-primary text-white font-semibold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retry Analysis
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground font-semibold text-xs border border-border/80 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Footer controls when running in background */}
        {!effectiveComplete && !effectiveError && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
            <button
              onClick={handleCancelClick}
              className="text-muted-foreground hover:text-rose-400 transition-colors"
            >
              Cancel Analysis
            </button>
            {onCloseBackground && (
              <button
                onClick={onCloseBackground}
                className="flex items-center gap-1.5 text-primary font-medium hover:underline"
              >
                <Minimize2 className="w-3.5 h-3.5" /> Continue in Background
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  X, CheckCircle2, AlertTriangle, HelpCircle, BarChart3, Database,
  TrendingUp, Activity, PieChart, Sparkles, BrainCircuit, FileText,
  MessageSquare, Sliders, ShieldCheck, ArrowRight, Layers, Table,
  FileSpreadsheet, Loader2, Play, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { datasetsApi } from "@/lib/api/client";

interface ColumnInfo {
  name: string;
  original_name?: string;
  data_type: string;
  semantic_type?: string;
  missing_pct?: number;
  unique_count?: number;
  sample_values?: any[];
}

interface FeatureInfo {
  title: string;
  available: boolean;
  reason: string;
}

interface RecommendedAnalysis {
  id: string;
  name: string;
  recommended: boolean;
  explanation: string;
  enabled: boolean;
}

export interface UploadResultData {
  dataset_id: string;
  name: string;
  filename: string;
  file_type?: string;
  file_size?: number;
  uploaded_at?: string;
  row_count: number;
  column_count: number;
  missing_pct?: number;
  duplicates?: number;
  numeric_columns_count?: number;
  categorical_columns_count?: number;
  datetime_columns_count?: number;
  text_columns_count?: number;
  dataset_type: string;
  dataset_type_label?: string;
  confidence: number;
  reason: string;
  quality_score: number;
  issues: string[];
  recommendations: string[];
  features: Record<string, FeatureInfo>;
  recommended_analyses: RecommendedAnalysis[];
  detected_selectors: {
    target_column?: string | null;
    date_column?: string | null;
    customer_column?: string | null;
    text_column?: string | null;
    measure_column?: string | null;
  };
  columns: ColumnInfo[];
  preview: Record<string, any>[];
  is_duplicate?: boolean;
  duplicate_dataset_id?: string | null;
  duplicate_name?: string | null;
  available_sheets?: string[];
  selected_sheet?: string;
  status?: string;
}

interface DatasetAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UploadResultData | null;
  onSaveOnly: (datasetId: string) => void;
  onStartAnalysis: (datasetId: string, config: any) => void;
  token?: string;
  onUseExisting?: (existingId: string) => void;
}

export function DatasetAnalysisModal({
  isOpen,
  onClose,
  data,
  onSaveOnly,
  onStartAnalysis,
  token,
  onUseExisting,
}: DatasetAnalysisModalProps) {
  // Selected analyses checkboxes state
  const [selectedAnalyses, setSelectedAnalyses] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (data?.recommended_analyses || []).forEach((rec) => {
      initial[rec.id] = rec.enabled && rec.recommended;
    });
    return initial;
  });

  // Selector overrides
  const [targetColumn, setTargetColumn] = useState<string>(data?.detected_selectors?.target_column || "");
  const [dateColumn, setDateColumn] = useState<string>(data?.detected_selectors?.date_column || "");
  const [customerColumn, setCustomerColumn] = useState<string>(data?.detected_selectors?.customer_column || "");
  const [textColumn, setTextColumn] = useState<string>(data?.detected_selectors?.text_column || "");
  const [measureColumn, setMeasureColumn] = useState<string>(data?.detected_selectors?.measure_column || "");

  // Sheets state for XLSX
  const [availableSheets, setAvailableSheets] = useState<string[]>(data?.available_sheets || ["Sheet1"]);
  const [selectedSheet, setSelectedSheet] = useState<string>(data?.selected_sheet || data?.available_sheets?.[0] || "Sheet1");
  const [isSwitchingSheet, setIsSwitchingSheet] = useState(false);

  // Dynamic preview & column state (strict 20 rows max)
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>(() => (data?.preview || []).slice(0, 20));
  const [columns, setColumns] = useState<ColumnInfo[]>(data?.columns || []);

  // Submission lock to avoid duplicate requests
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever new data is provided
  useEffect(() => {
    if (!data) return;
    const initial: Record<string, boolean> = {};
    (data.recommended_analyses || []).forEach((rec) => {
      initial[rec.id] = rec.enabled && rec.recommended;
    });
    setSelectedAnalyses(initial);
    setTargetColumn(data.detected_selectors?.target_column || "");
    setDateColumn(data.detected_selectors?.date_column || "");
    setCustomerColumn(data.detected_selectors?.customer_column || "");
    setTextColumn(data.detected_selectors?.text_column || "");
    setMeasureColumn(data.detected_selectors?.measure_column || "");
    setAvailableSheets(data.available_sheets || ["Sheet1"]);
    setSelectedSheet(data.selected_sheet || data.available_sheets?.[0] || "Sheet1");
    setPreviewRows((data.preview || []).slice(0, 20));
    setColumns(data.columns || []);
    setIsSubmitting(false);
  }, [data]);

  const toggleAnalysis = (id: string) => {
    setSelectedAnalyses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!data || sheetName === selectedSheet || !token) return;
    setIsSwitchingSheet(true);
    try {
      const res = await datasetsApi.selectSheet(token, data.dataset_id, sheetName);
      setSelectedSheet(sheetName);
      setPreviewRows((res.rows || []).slice(0, 20));
      if (res.columns && res.column_metadata) {
        setColumns(
          res.column_metadata.map((c) => ({
            name: c.name,
            data_type: c.data_type,
            sample_values: c.sample_values,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to select sheet:", e);
    } finally {
      setIsSwitchingSheet(false);
    }
  };

  const handleAnalyze = () => {
    if (isSubmitting || !data) return;
    setIsSubmitting(true);
    const chosenModules = Object.keys(selectedAnalyses).filter((k) => selectedAnalyses[k]);
    onStartAnalysis(data.dataset_id, {
      selected_modules: chosenModules,
      target_column: targetColumn || undefined,
      date_column: dateColumn || undefined,
      customer_column: customerColumn || undefined,
      text_column: textColumn || undefined,
      measure_column: measureColumn || undefined,
      selected_sheet: selectedSheet,
    });
  };

  const handleSaveAndAnalyze = () => {
    handleAnalyze();
  };

  const handleSaveOnly = () => {
    if (isSubmitting || !data) return;
    setIsSubmitting(true);
    onSaveOnly(data.dataset_id);
  };

  const allColumns = columns || [];
  const numericColumns = allColumns.filter((c) => ["integer", "float", "numeric"].includes(c.data_type));
  const textColumns = allColumns.filter((c) => ["text", "categorical"].includes(c.data_type));
  const dateColumns = allColumns.filter((c) => ["datetime", "date"].includes(c.data_type));

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen || !data) return null;

  const featureCards = Object.entries(data.features || {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl my-auto glass-card bg-background/95 border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Dataset Ready for Analysis
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Profiled & Verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dynamic schema inspection, quality audit, and feature capability planning completed.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-foreground">

          {/* Duplicate Dataset Alert (Section 28) */}
          {data.is_duplicate && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-amber-500">Similar Dataset Already Exists</p>
                  <p className="text-muted-foreground mt-0.5">
                    An identical file hash was found in your workspace: <strong>{data.duplicate_name}</strong>.
                  </p>
                </div>
              </div>
              {onUseExisting && data.duplicate_dataset_id && (
                <button
                  onClick={() => onUseExisting(data.duplicate_dataset_id!)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors shrink-0"
                >
                  Use Existing
                </button>
              )}
            </div>
          )}

          {/* Section 1: Dataset Overview Header Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Dataset Name</span>
              <span className="text-sm font-bold text-foreground truncate block mt-0.5" title={data.filename}>
                {data.name}
              </span>
              <span className="text-[10px] text-muted-foreground/80 font-mono mt-0.5 block">{data.filename}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">File Specs</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-foreground uppercase">{data.file_type || "CSV"}</span>
                <span className="text-xs text-muted-foreground">• {formatFileSize(data.file_size)}</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-medium mt-0.5 block">Safe Tabular Format</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Total Records</span>
              <span className="text-sm font-bold text-foreground block mt-0.5">
                {data.row_count.toLocaleString()} rows
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {data.column_count} schema columns
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Ingested At</span>
              <span className="text-sm font-bold text-foreground block mt-0.5">
                {data.uploaded_at ? new Date(data.uploaded_at).toLocaleDateString() : "Just now"}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {data.uploaded_at ? new Date(data.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
              </span>
            </div>
          </div>

          {/* Section 4: Multi-sheet Selector for Excel (Section 4) */}
          {availableSheets.length > 1 && (
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Select Excel Worksheet:</span>
                <span className="text-[11px] text-muted-foreground">Preview & analysis will target the chosen sheet</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableSheets.map((sheet) => (
                  <button
                    key={sheet}
                    disabled={isSwitchingSheet}
                    onClick={() => handleSheetChange(sheet)}
                    className={cn(
                      "px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
                      selectedSheet === sheet
                        ? "gradient-primary text-white shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60"
                    )}
                  >
                    {isSwitchingSheet && selectedSheet === sheet && <Loader2 className="w-3 h-3 animate-spin" />}
                    {sheet}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Data Preview (Strict Top 20 Rows) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Section A: Dataset Preview
                </h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/60">
                Showing first {Math.min(previewRows.length, 20)} rows • Complete dataset ({data.row_count.toLocaleString()} rows) profiled in backend
              </span>
            </div>

            <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/40">
              <div className="max-h-60 overflow-x-auto overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/60 border-b border-border/60 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground border-r border-border/40 w-12 text-center">
                        #
                      </th>
                      {allColumns.map((col) => (
                        <th key={col.name} className="px-3 py-2 font-semibold text-foreground border-r border-border/40 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[140px]" title={col.name}>{col.name}</span>
                            <span className="text-[9px] font-mono font-normal text-muted-foreground/80 lowercase">
                              {col.data_type}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {previewRows.length === 0 ? (
                      <tr>
                        <td colSpan={allColumns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                          No preview rows available.
                        </td>
                      </tr>
                    ) : (
                      previewRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground border-r border-border/40 text-center bg-muted/10">
                            {rIdx + 1}
                          </td>
                          {allColumns.map((col) => {
                            const val = row[col.name];
                            return (
                              <td key={col.name} className="px-3 py-1.5 font-mono text-[11px] border-r border-border/40 whitespace-nowrap max-w-[180px] truncate" title={String(val ?? "")}>
                                {val === null || val === undefined ? (
                                  <span className="text-muted-foreground/40 italic">null</span>
                                ) : typeof val === "boolean" ? (
                                  <span className={val ? "text-emerald-500 font-bold" : "text-rose-400 font-bold"}>
                                    {String(val)}
                                  </span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Data Profile Breakdown */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Section B: Data Profile & Type Distribution
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                <span className="text-[11px] text-muted-foreground">Numerical Features</span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {data.numeric_columns_count ?? numericColumns.length}
                </p>
                <span className="text-[10px] text-muted-foreground">Integers & Floats</span>
              </div>

              <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                <span className="text-[11px] text-muted-foreground">Categorical & Text</span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {data.categorical_columns_count ?? textColumns.length}
                </p>
                <span className="text-[10px] text-muted-foreground">Discrete Categories</span>
              </div>

              <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                <span className="text-[11px] text-muted-foreground">Temporal Axes</span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {data.datetime_columns_count ?? dateColumns.length}
                </p>
                <span className="text-[10px] text-muted-foreground">Timestamps / Dates</span>
              </div>

              <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                <span className="text-[11px] text-muted-foreground">Missing Cells</span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {data.missing_pct?.toFixed(1) || "0.0"}%
                </p>
                <span className="text-[10px] text-muted-foreground">Duplicate Rows: {data.duplicates || 0}</span>
              </div>
            </div>
          </div>

          {/* Section 4 & 5: Data Quality + Detected Dataset Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Data Quality Score (Section 13) */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Section C: Data Quality Audit
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold text-emerald-500 font-mono">
                    {data.quality_score}/100
                  </span>
                </div>
              </div>

              {data.issues && data.issues.length > 0 ? (
                <div className="space-y-1.5">
                  {data.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-500/90 bg-amber-500/5 p-2 rounded-xl border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No severe missing values, type anomalies, or constant column defects detected.</span>
                </div>
              )}
            </div>

            {/* Detected Dataset Type (Section 14) */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Section D: Inferred Domain Archetype
                </h4>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-foreground">
                  {data.dataset_type_label || data.dataset_type.replace("-", " ").toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {Math.round(data.confidence * 100)}% Confidence
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {data.reason}
              </p>
            </div>
          </div>

          {/* Section 6 & 7: 14 Universal Capabilities (Available vs Unavailable) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Section E: 14 Universal Analysis Capabilities
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {featureCards.map(([key, feat]) => (
                <div
                  key={key}
                  className={cn(
                    "p-3 rounded-2xl border text-xs transition-all flex flex-col justify-between",
                    feat.available
                      ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-muted/10 border-border/40 opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground truncate">{feat.title}</span>
                    {feat.available ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-500 shrink-0">
                        Available
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground shrink-0">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2" title={feat.reason}>
                    {feat.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 8: Recommended Analyses & Selectors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Section F: Recommended Analyses & Column Selectors
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Checkboxes for Recommended Analyses */}
              <div className="space-y-2">
                {(data.recommended_analyses || []).map((rec) => (
                  <label
                    key={rec.id}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                      !rec.enabled
                        ? "opacity-50 cursor-not-allowed bg-muted/10 border-border/40"
                        : selectedAnalyses[rec.id]
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-card/40 border-border/60 hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={!rec.enabled}
                      checked={!!selectedAnalyses[rec.id]}
                      onChange={() => toggleAnalysis(rec.id)}
                      className="rounded border-border/80 text-primary mt-0.5 focus:ring-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">{rec.name}</span>
                        {rec.recommended && (
                          <span className="text-[9px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{rec.explanation}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Parameter Overrides */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  Column Parameter Overrides
                </span>

                {/* Target Column */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Supervised ML Target Column:
                  </label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border/80 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Auto-Detect / None --</option>
                    {allColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.data_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Column */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Temporal / Date Axis:
                  </label>
                  <select
                    value={dateColumn}
                    onChange={(e) => setDateColumn(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border/80 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Auto-Detect / None --</option>
                    {dateColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer / Entity ID */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Entity / Customer Identifier:
                  </label>
                  <select
                    value={customerColumn}
                    onChange={(e) => setCustomerColumn(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border/80 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Auto-Detect / None --</option>
                    {allColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.data_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* NLP Text Column */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    NLP / Free-Text Column:
                  </label>
                  <select
                    value={textColumn}
                    onChange={(e) => setTextColumn(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border/80 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- None / Inferred --</option>
                    {allColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.data_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Primary Numeric Measure */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Primary Numeric Measure:
                  </label>
                  <select
                    value={measureColumn}
                    onChange={(e) => setMeasureColumn(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border/80 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Inferred Measure --</option>
                    {numericColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.data_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: 4 Clear Actions (Section 1 & 43) */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto flex-wrap">
            {token && (
              <button
                type="button"
                onClick={() => {
                  if (data.dataset_id && token) {
                    datasetsApi.downloadFile(token, data.dataset_id, data.filename || `${data.name}.csv`);
                  }
                }}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/70 transition-colors flex items-center gap-1.5"
                title="Download original uploaded file"
              >
                <Download className="w-3.5 h-3.5" /> Download File
              </button>
            )}

            <button
              onClick={handleSaveOnly}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-muted/60 hover:bg-muted border border-border/80 transition-colors flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" /> Save Dataset
            </button>

            <button
              onClick={handleAnalyze}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Analyze Now
            </button>

            <button
              onClick={handleSaveAndAnalyze}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white gradient-primary hover:opacity-90 transition-all shadow-md flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Save & Analyze
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

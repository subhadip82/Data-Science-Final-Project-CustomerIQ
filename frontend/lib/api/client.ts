/**
 * CustomerIQ API Client
 * Centralized fetch layer — all API calls go through here.
 */

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl.replace(/\/+$/, "");
    }
    // Match current window hostname and protocol so port 8000 is always aligned with client origin
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
}

export const API_BASE = getApiBase();

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function getToken(): Promise<string | null> {
  // Server-side: use Clerk server auth
  if (typeof window === "undefined") {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { getToken: clerkGetToken } = await auth();
      return await clerkGetToken();
    } catch {
      return null;
    }
  }
  // Client-side: token injected by useApi hook
  return null;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const authToken = token || (await getToken());
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const baseUrl = getApiBase();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (err: any) {
    // If connection failed on loopback (e.g. localhost vs 127.0.0.1 IPv6/IPv4 mismatch), retry with alternate
    const fallbackBase = baseUrl.includes("localhost")
      ? baseUrl.replace("localhost", "127.0.0.1")
      : baseUrl.includes("127.0.0.1")
      ? baseUrl.replace("127.0.0.1", "localhost")
      : null;

    if (fallbackBase) {
      try {
        res = await fetch(`${fallbackBase}${path}`, {
          ...options,
          headers,
          cache: "no-store",
        });
      } catch (retryErr: any) {
        throw new APIError(0, err.message || "Failed to fetch from backend", err);
      }
    } else {
      throw new APIError(0, err.message || "Failed to fetch from backend", err);
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new APIError(res.status, errorData.detail || "Request failed", errorData);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  sync: (data: { clerk_user_id: string; email: string; full_name?: string; avatar_url?: string }, token: string) =>
    apiRequest("/api/v1/auth/sync", { method: "POST", body: JSON.stringify(data) }, token),

  me: (token: string) => apiRequest("/api/v1/auth/me", {}, token),
  workspace: (token: string) => apiRequest("/api/v1/auth/workspace", {}, token),
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsApi = {
  summary: (token: string, params?: { from_date?: string; to_date?: string }) => {
    const q = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiRequest(`/api/v1/analytics/summary${q}`, {}, token);
  },
  full: (token: string, params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest(`/api/v1/analytics${q}`, {}, token);
  },
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersApi = {
  list: (token: string, params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest(`/api/v1/customers${q}`, {}, token);
  },
  detail: (token: string, id: string) =>
    apiRequest(`/api/v1/customers/${id}`, {}, token),
};

// ─── Segments ─────────────────────────────────────────────────────────────────
export const segmentsApi = {
  all: (token: string) => apiRequest("/api/v1/segments", {}, token),
  customers: (token: string, label: string, params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest(`/api/v1/segments/${encodeURIComponent(label)}/customers${q}`, {}, token);
  },
};

// ─── RFM ──────────────────────────────────────────────────────────────────────
export const rfmApi = {
  get: (token: string, params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest(`/api/v1/rfm${q}`, {}, token);
  },
};

// ─── Sales ────────────────────────────────────────────────────────────────────
export const salesApi = {
  get: (token: string, params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest(`/api/v1/sales${q}`, {}, token);
  },
};

// ─── Insights ─────────────────────────────────────────────────────────────────
export const insightsApi = {
  get: (token: string) => apiRequest("/api/v1/insights", {}, token),
};

// ─── Recommendations ──────────────────────────────────────────────────────────
export const recommendationsApi = {
  get: (token: string) => apiRequest("/api/v1/recommendations", {}, token),
};

// ─── Upload ───────────────────────────────────────────────────────────────────
export const uploadApi = {
  upload: async (token: string, file: File): Promise<unknown> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${getApiBase()}/api/v1/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new APIError(res.status, err.detail || "Upload failed", err);
    }
    return res.json();
  },
  status: (token: string, datasetId: string) =>
    apiRequest(`/api/v1/upload/status/${datasetId}`, {}, token),
  history: (token: string) => apiRequest("/api/v1/upload/history", {}, token),
};

// ─── Notifications ────────────────────────────────────────────────────
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  severity?: string;
  is_read: boolean;
  target_route?: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: (token: string, limit = 8) =>
    apiRequest<{ items: NotificationItem[]; unread_count: number; total: number }>(
      `/api/v1/notifications?limit=${limit}`,
      {},
      token
    ),
  unreadCount: (token: string) =>
    apiRequest<{ unread_count: number }>("/api/v1/notifications/unread-count", {}, token),
  markRead: (token: string, id: string) =>
    apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" }, token),
  markAllRead: (token: string) =>
    apiRequest("/api/v1/notifications/mark-all-read", { method: "PATCH" }, token),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  list: (token: string) => apiRequest("/api/v1/reports", {}, token),
  generate: (token: string, reportType = "summary", datasetId?: string) => {
    const params = new URLSearchParams();
    if (reportType) params.set("report_type", reportType);
    if (datasetId) params.set("dataset_id", datasetId);
    return apiRequest<{ status: string; report_id: string; name?: string; type?: string }>(
      `/api/v1/reports/generate?${params.toString()}`,
      { method: "POST" },
      token
    );
  },
  delete: (token: string, id: string) =>
    apiRequest(`/api/v1/reports/${id}`, { method: "DELETE" }, token),
};

// ─── Datasets Management ──────────────────────────────────────────────────────
export const datasetsApi = {
  list: (token: string) => apiRequest<{ items: any[]; total: number }>("/api/v1/datasets", {}, token),
  getActive: (token: string) => apiRequest<{ has_active: boolean; dataset: any }>("/api/v1/datasets/active", {}, token),
  activate: (token: string, datasetId: string) =>
    apiRequest(`/api/v1/datasets/${datasetId}/activate`, { method: "POST" }, token),
  analyze: (token: string, datasetId: string, config?: any) =>
    apiRequest(`/api/v1/datasets/${datasetId}/analyze`, { method: "POST", body: JSON.stringify(config || {}) }, token),
  preview: (token: string, datasetId: string, limit = 20) =>
    apiRequest<{ dataset_id: string; name: string; rows: any[]; total_rows: number; columns: string[] }>(
      `/api/v1/datasets/${datasetId}/preview?limit=${limit}`,
      {},
      token
    ),
  downloadUrl: (datasetId: string, token?: string) =>
    `${getApiBase()}/api/v1/datasets/${datasetId}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`,
  downloadFile: async (token: string, datasetId: string, filename?: string) => {
    const res = await fetch(`${getApiBase()}/api/v1/datasets/${datasetId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to download dataset file.");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `dataset_${datasetId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  getProfile: (token: string, datasetId: string) =>
    apiRequest<any>(`/api/v1/datasets/${datasetId}/profile`, {}, token),
  getQuality: (token: string, datasetId: string) =>
    apiRequest<any>(`/api/v1/datasets/${datasetId}/quality`, {}, token),
  getCapabilities: (token: string, datasetId: string) =>
    apiRequest<any>(`/api/v1/datasets/${datasetId}/capabilities`, {}, token),
  getPlan: (token: string, datasetId: string) =>
    apiRequest<any>(`/api/v1/datasets/${datasetId}/analysis-plan`, {}, token),
  getSheets: (token: string, datasetId: string) =>
    apiRequest<{ dataset_id: string; available_sheets: string[]; selected_sheet: string }>(
      `/api/v1/datasets/${datasetId}/sheets`,
      {},
      token
    ),
  selectSheet: (token: string, datasetId: string, sheetName: string) =>
    apiRequest<{ status: string; selected_sheet: string; rows: any[]; columns: string[]; column_metadata: any[] }>(
      `/api/v1/datasets/${datasetId}/select-sheet`,
      { method: "POST", body: JSON.stringify({ sheet_name: sheetName }) },
      token
    ),
  rename: (token: string, datasetId: string, name: string) =>
    apiRequest(`/api/v1/datasets/${datasetId}`, { method: "PATCH", body: JSON.stringify({ name }) }, token),
  delete: (token: string, datasetId: string) =>
    apiRequest(`/api/v1/datasets/${datasetId}`, { method: "DELETE" }, token),
};

// ─── Analysis Background Jobs ────────────────────────────────────────────────
export interface AnalysisJobStatus {
  job_id: string;
  dataset_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  current_step: string;
  completed_steps: string[];
  error?: string | null;
  created_at?: string;
  completed_at?: string;
}

export const analysisJobsApi = {
  create: (token: string, data: {
    dataset_id: string;
    selected_modules?: string[];
    target_column?: string;
    date_column?: string;
    customer_column?: string;
    text_column?: string;
    measure_column?: string;
  }) =>
    apiRequest<AnalysisJobStatus>(
      "/api/v1/analysis/jobs",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),
  get: (token: string, jobId: string) =>
    apiRequest<AnalysisJobStatus>(`/api/v1/analysis/jobs/${jobId}`, {}, token),
  cancel: (token: string, jobId: string) =>
    apiRequest<{ status: string; message: string }>(
      `/api/v1/analysis/jobs/${jobId}/cancel`,
      { method: "POST" },
      token
    ),
  retry: (token: string, jobId: string) =>
    apiRequest<AnalysisJobStatus>(
      `/api/v1/analysis/jobs/${jobId}/retry`,
      { method: "POST" },
      token
    ),
};

// ─── Sharing & Email ──────────────────────────────────────────────────────────
export const shareApi = {
  sendEmail: (token: string, data: { recipient_email: string; dataset_id?: string; report_id?: string; custom_message?: string; include_sections?: string[] }) =>
    apiRequest<{ status: string; message: string; email_id: string; recipient: string; share_url: string }>(
      "/api/v1/share/email",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),
  createLink: (token: string, data: { dataset_id?: string; report_id?: string; title?: string; allowed_sections?: string[]; expires_in_days?: number }) =>
    apiRequest<{ status: string; token: string; share_url: string; expires_at: string; title: string }>(
      "/api/v1/share/link",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),
  getView: async (shareToken: string) => {
    const res = await fetch(`${getApiBase()}/api/v1/share/view/${shareToken}`, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Shared report not available." }));
      throw new Error(err.detail || "Unable to load shared report.");
    }
    return res.json();
  },
  revokeLink: (token: string, shareToken: string) =>
    apiRequest(`/api/v1/share/link/${shareToken}`, { method: "DELETE" }, token),
};

// ─── Data Profile ─────────────────────────────────────────────────────────────
export const dataProfileApi = {
  get: (token: string, datasetId?: string) => {
    const q = datasetId ? `?dataset_id=${datasetId}` : "";
    return apiRequest<any>(`/api/v1/data-profile${q}`, {}, token);
  },
};

// ─── Workspace & Storage ──────────────────────────────────────────────────────
export const workspaceApi = {
  getStorage: (token: string) =>
    apiRequest<{ used_bytes: number; used_mb: number; quota_mb: number; used_pct: number; file_count: number; status_text: string }>(
      "/api/v1/workspace/storage",
      {},
      token
    ),
};

// ─── Machine Learning ─────────────────────────────────────────────────────────
export const mlApi = {
  train: (token: string, data: { target_column: string; feature_columns?: string[]; task_type?: string }) =>
    apiRequest<any>("/api/v1/ml/train", { method: "POST", body: JSON.stringify(data) }, token),
};

// ─── Statistics ───────────────────────────────────────────────────────────────
export const statisticsApi = {
  get: (token: string, method = "pearson") =>
    apiRequest<any>(`/api/v1/statistics?method=${method}`, {}, token),
};

// ─── Feature Importance & Drivers ─────────────────────────────────────────────
export interface FeatureDriverItem {
  name: string;
  display_name: string;
  importance: number;
  importance_pct: number;
  correlation: number;
  direction: "positive" | "negative" | "neutral";
  impact_level: "critical" | "high" | "moderate" | "low";
  data_type: "numeric" | "categorical" | "boolean";
  unique_values: number;
  rank: number;
  summary_insight: string;
}

export interface FeatureImportanceResponse {
  has_dataset: boolean;
  status: string;
  message?: string;
  dataset_id?: string;
  dataset_name?: string;
  dataset_type?: string;
  total_rows?: number;
  total_columns?: number;
  target_column?: string;
  target_display_name?: string;
  task_type?: "classification" | "regression";
  model_type?: string;
  model_score?: number;
  total_features?: number;
  primary_driver?: FeatureDriverItem | null;
  top_positive_driver?: FeatureDriverItem | null;
  top_negative_driver?: FeatureDriverItem | null;
  features: FeatureDriverItem[];
  all_features_count?: number;
  recommendations?: Array<{
    title: string;
    priority: "high" | "medium" | "low";
    action: string;
    impact: string;
  }>;
  relationships?: Array<{
    feature: string;
    display_name: string;
    data: Array<{
      range: string;
      feature_avg: number;
      target_avg: number;
    }>;
  }>;
}

export const featuresApi = {
  getImportance: (
    token: string,
    params?: { dataset_id?: string; target_column?: string; top_k?: number }
  ) => {
    const q = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params)
            .filter(([_, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : "";
    return apiRequest<FeatureImportanceResponse>(`/api/v1/features/importance${q}`, {}, token);
  },
  getTargets: (token: string, datasetId?: string) => {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : "";
    return apiRequest<{
      has_dataset: boolean;
      dataset_id?: string;
      dataset_name?: string;
      targets: Array<{
        column: string;
        display_name: string;
        data_type: string;
        unique_values: number;
        is_candidate: boolean;
      }>;
    }>(`/api/v1/features/targets${q}`, {}, token);
  },
};

export { APIError };


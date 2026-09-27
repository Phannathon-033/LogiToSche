import { apiFetch } from "./apiClient";
import type {
  AdminDocumentRecord,
  AdminErrorCluster,
  AdminPromptLabState,
  JsonSchemaOutput,
} from "../types";

export interface AdminStatsResponse {
  totalDocs: number;
  reviewDocs: number;
  correctedDocs: number;
  repeatedErrorFields: string[];
  baselineDocs: number;
}

export interface AdminDocumentUpdatePayload {
  jsonOutput: JsonSchemaOutput;
  correctionReason: string;
}

export interface AdminPromptLabResponse extends AdminPromptLabState {
  version: string;
}

const API_BASE = "/api/admin";

export async function getAdminOverviewStats(): Promise<AdminStatsResponse> {
  const res = await apiFetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch admin statistics");
  return (await res.json()) as AdminStatsResponse;
}

export async function getAdminDocuments(params?: {
  search?: string;
  status?: string;
  type?: string;
  tag?: string;
}): Promise<AdminDocumentRecord[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.status) query.append("status", params.status);
  if (params?.type) query.append("type", params.type);
  if (params?.tag) query.append("tag", params.tag);

  const res = await apiFetch(`${API_BASE}/documents?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch admin documents queue");
  return (await res.json()) as AdminDocumentRecord[];
}

export async function updateAdminDocument(
  docId: string,
  payload: AdminDocumentUpdatePayload,
): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${API_BASE}/documents/${docId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save and override document details");
  return (await res.json()) as { success: boolean; message: string };
}

export async function getAdminPromptLab(): Promise<AdminPromptLabResponse> {
  const res = await apiFetch(`${API_BASE}/prompt-lab`);
  if (!res.ok) throw new Error("Failed to fetch prompt lab settings");
  return (await res.json()) as AdminPromptLabResponse;
}

export async function saveAdminPromptLab(
  settings: AdminPromptLabState,
): Promise<{ success: boolean }> {
  const res = await apiFetch(`${API_BASE}/prompt-lab`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save prompt lab settings");
  return (await res.json()) as { success: boolean };
}

export async function getAdminErrorClusters(): Promise<AdminErrorCluster[]> {
  const res = await apiFetch(`${API_BASE}/error-clusters`);
  if (!res.ok) throw new Error("Failed to fetch admin error clusters");
  return (await res.json()) as AdminErrorCluster[];
}

export interface SystemHealthData {
  status: "all_active" | "partial" | "offline";
  status_label: string;
  uptime_human: string;
  uptime_seconds: number;
  gpu: {
    name: string;
    engine: string;
    cuda_version: string;
    driver_version: string;
    utilization: number;
    status: string;
  };
  vram: {
    used_mb: number;
    total_mb: number;
    free_mb: number;
    used_gb: number;
    total_gb: number;
    label: string;
    percent: number;
  };
  ocr: {
    engine: string;
    device: string;
    status: string;
    cuda: boolean;
  };
  slm: {
    model: string;
    device: string;
    status: string;
    cuda: boolean;
  };
}

export async function getSystemHealth(): Promise<SystemHealthData> {
  const res = await apiFetch("/api/system/health");
  if (!res.ok) throw new Error("Failed to fetch system health");
  return (await res.json()) as SystemHealthData;
}

export interface PerformanceRecord {
  timestamp: string;
  doc_id: string;
  file_name: string;
  fold?: number;
  ocr_time_sec: number;
  slm_time_sec: number;
  total_time_sec: number;
  matched_fields: number;
  total_fields: number;
  accuracy_pct: number;
}

export interface PerformanceLogResponse {
  records: PerformanceRecord[];
  summary: {
    total_documents_logged: number;
    mean_ocr_time_sec: number;
    mean_slm_time_sec: number;
    mean_total_time_sec: number;
    min_total_time_sec: number;
    max_total_time_sec: number;
  };
}

export interface EvaluationJobStatusResponse {
  job_id?: string;
  status: "idle" | "running" | "completed" | "stopped" | "failed" | string;
  is_running?: boolean;
  completed_docs?: number;
  total_docs?: number;
  current_fold?: number;
  k_splits?: number;
  current_doc_id?: string;
  current_file_name?: string;
  elapsed_seconds?: number;
  live_accuracy_pct?: number;
  logs?: string[];
  recent_logs?: string[];
  final_report?: any;
  final_accuracy?: string;
  final_f1?: string;
  excel_report_file?: string;
}

export async function getPerformanceLogs(): Promise<PerformanceLogResponse> {
  const res = await apiFetch("/api/benchmark/performance-log");
  if (!res.ok) throw new Error("Failed to fetch performance logs");
  return (await res.json()) as PerformanceLogResponse;
}

export async function getEvaluationJobStatus(): Promise<EvaluationJobStatusResponse> {
  const res = await apiFetch("/api/evaluation/status");
  if (!res.ok) throw new Error("Failed to fetch evaluation status");
  return (await res.json()) as EvaluationJobStatusResponse;
}

export async function startEvaluation(payload?: Record<string, any>): Promise<any> {
  const res = await apiFetch("/api/evaluation/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error("Failed to start evaluation job");
  return await res.json();
}

export async function stopEvaluation(): Promise<any> {
  const res = await apiFetch("/api/evaluation/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to stop evaluation job");
  return await res.json();
}


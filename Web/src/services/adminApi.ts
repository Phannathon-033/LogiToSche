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
  const res = await fetch(`${API_BASE}/stats`);
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

  const res = await fetch(`${API_BASE}/documents?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch admin documents queue");
  return (await res.json()) as AdminDocumentRecord[];
}

export async function updateAdminDocument(
  docId: string,
  payload: AdminDocumentUpdatePayload,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save and override document details");
  return (await res.json()) as { success: boolean; message: string };
}

export async function getAdminPromptLab(): Promise<AdminPromptLabResponse> {
  const res = await fetch(`${API_BASE}/prompt-lab`);
  if (!res.ok) throw new Error("Failed to fetch prompt lab settings");
  return (await res.json()) as AdminPromptLabResponse;
}

export async function saveAdminPromptLab(
  settings: AdminPromptLabState,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/prompt-lab`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save prompt lab settings");
  return (await res.json()) as { success: boolean };
}

export async function getAdminErrorClusters(): Promise<AdminErrorCluster[]> {
  const res = await fetch(`${API_BASE}/error-clusters`);
  if (!res.ok) throw new Error("Failed to fetch admin error clusters");
  return (await res.json()) as AdminErrorCluster[];
}

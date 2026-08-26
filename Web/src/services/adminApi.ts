import type { JsonSchemaOutput } from "../types";

export interface AdminStatsResponse {
  totalDocs: number;
  successDocs: number;
  reviewDocs: number;
  errorDocs: number;
  successRate: number;
  avgConfidence: number;
  breakdown: {
    Invoice: number;
    BillOfLading: number;
    PackingList: number;
    PurchaseOrder: number;
  };
}

export interface AdminSettingsDto {
  confidenceThreshold: number;
  selectedModel: string;
  systemPrompt: string;
}

export interface AdminUserDto {
  name: string;
  role: string;
  email: string;
  status: string;
  docs: number;
}

export interface AdminActivityLogDto {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  target: string;
  category: string;
  ip: string;
}

// Endpoint base config
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
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.status) query.append("status", params.status);
  if (params?.type) query.append("type", params.type);

  const res = await fetch(`${API_BASE}/documents?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch admin documents queue");
  return await res.json();
}

export async function updateAdminDocument(
  docId: string,
  updatedJson: JsonSchemaOutput
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedJson),
  });
  if (!res.ok) throw new Error("Failed to save and override document details");
  return (await res.json()) as { success: boolean; message: string };
}

export async function getAdminSettings(): Promise<AdminSettingsDto> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error("Failed to fetch system configurations");
  return (await res.json()) as AdminSettingsDto;
}

export async function saveAdminSettings(
  settings: AdminSettingsDto
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save system configurations");
  return (await res.json()) as { success: boolean };
}

export async function getAdminUsersList(): Promise<AdminUserDto[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error("Failed to fetch registered user list");
  return (await res.json()) as AdminUserDto[];
}

export async function toggleAdminUserStatus(
  email: string,
  newStatus: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/users/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, status: newStatus }),
  });
  if (!res.ok) throw new Error("Failed to update user status");
  return (await res.json()) as { success: boolean };
}

export async function getAdminActivityLogs(): Promise<AdminActivityLogDto[]> {
  const res = await fetch(`${API_BASE}/logs`);
  if (!res.ok) throw new Error("Failed to fetch audit security logs");
  return (await res.json()) as AdminActivityLogDto[];
}

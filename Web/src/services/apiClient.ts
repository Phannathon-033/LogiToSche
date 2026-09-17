/**
 * LogiAI Unified HTTP Client
 * Automatically handles:
 * 1. Base URL routing (VITE_API_BASE_URL or relative /api via Vite proxy)
 * 2. X-LogiAI-Token header injection from VITE_API_TOKEN
 * 3. Prevention of leaked direct port 8001 connections
 */

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
const RAW_TOKEN = (import.meta.env.VITE_API_TOKEN || "").trim();

export const API_BASE_URL = RAW_BASE_URL;

export function getApiBaseUrl(): string {
  return RAW_BASE_URL;
}

export function getApiToken(): string {
  return RAW_TOKEN;
}

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!RAW_BASE_URL) {
    return cleanPath;
  }
  return `${RAW_BASE_URL}${cleanPath}`;
}

export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (RAW_TOKEN) {
    headers["X-LogiAI-Token"] = RAW_TOKEN;
  }
  return headers;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = buildApiUrl(input);
  const headers = new Headers(init.headers || {});

  if (RAW_TOKEN && !headers.has("X-LogiAI-Token")) {
    headers.set("X-LogiAI-Token", RAW_TOKEN);
  }

  return fetch(url, {
    ...init,
    headers,
  });
}

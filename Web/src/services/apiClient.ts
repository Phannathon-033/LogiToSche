export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

const API_TOKEN = import.meta.env.VITE_API_TOKEN?.trim();

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (API_TOKEN) headers.set("X-LogiAI-Token", API_TOKEN);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

export { API_TOKEN };

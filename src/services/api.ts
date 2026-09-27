/**
 * HTTP client for the FastAPI backend.
 * All REST calls go through `http()`. Endpoint paths are the proposed
 * contract — align them with the backend routers.
 */
import { API_URL, DATA_SOURCE } from '@/config';

export const isDemo = DATA_SOURCE === 'demo';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }
  });
  if (!res.ok) throw new ApiError(res.status, `${init.method ?? 'GET'} ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const post = <T>(path: string, body: unknown) => http<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) => http<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const del = <T>(path: string) => http<T>(path, { method: 'DELETE' });

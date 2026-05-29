// İstemci tarafı basit fetch sarmalayıcı. { ok, data } / { ok:false, error } sözleşmesi.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new ApiError(json?.error || 'İstek başarısız oldu', res.status);
  }
  return json.data as T;
}

export const apiGet = <T = unknown>(path: string) => request<T>(path);

export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const apiPatch = <T = unknown>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });

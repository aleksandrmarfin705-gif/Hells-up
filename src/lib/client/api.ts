export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

let memoryToken: string | null = null;
let onUnauthorized: (() => Promise<boolean>) | null = null;

export const setApiToken = (t: string | null) => { memoryToken = t; };
export const setUnauthorizedHandler = (fn: (() => Promise<boolean>) | null) => { onUnauthorized = fn; };

export const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('');

type Opts = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal };

export async function api<T = any>(path: string, opts: Opts = {}, retried = false): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined ? 'POST' : 'GET');
  const headers: Record<string, string> = { 'x-hu-client': '1' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (memoryToken) headers.authorization = `Bearer ${memoryToken}`;

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin', signal: opts.signal });
  } catch {
    throw new ApiClientError(0, 'network', 'Нет соединения с сервером');
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* пустой ответ */ }

  if (res.status === 401 && !retried && onUnauthorized && !path.startsWith('/api/auth/')) {
    if (await onUnauthorized()) return api<T>(path, opts, true);
  }
  if (!res.ok) {
    throw new ApiClientError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Что-то пошло не так');
  }
  return data as T;
}

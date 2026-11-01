import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { ApiError, mapDbError } from '@/lib/errors';

let client: SupabaseClient | undefined;

/** Серверный клиент с service_role. Ключ никогда не попадает в браузер. */
export function db(): SupabaseClient {
  const url = env.supabaseUrl();
  const key = env.supabaseServiceKey();
  if (!url || !key) throw new ApiError(503, 'not_configured', 'Supabase не подключён: задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
  return (client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

/** Вызов RPC с преобразованием ошибок Postgres в ApiError. */
export async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error(`[rpc:${fn}]`, error);
    throw mapDbError(error.message);
  }
  return data as T;
}

/** Утверждение «запрос без ошибки» для обычных запросов supabase-js. */
export function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    if (process.env.NODE_ENV !== 'production') console.error('[db]', res.error);
    throw new ApiError(500, 'db_error', 'Ошибка базы данных');
  }
  return res.data as T;
}

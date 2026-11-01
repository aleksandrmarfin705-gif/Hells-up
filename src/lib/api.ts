import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { db, check } from '@/lib/supabase/admin';
import { readSession } from '@/lib/auth/session';
import { isAdminTelegramId } from '@/lib/env';
import { getSettings } from '@/lib/settings';
import { rateLimit } from '@/lib/ratelimit';

export type DbUser = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  balance: number;
  is_banned: boolean;
  ban_reason: string | null;
  last_topup_at: string | null;
  last_seen_at: string;
  created_at: string;
};

export type Ctx<B> = {
  req: NextRequest;
  user: DbUser;
  isAdmin: boolean;
  body: B;
  params: Record<string, string>;
  query: URLSearchParams;
};

type Opts<S extends z.ZodTypeAny | undefined> = {
  auth?: 'none' | 'user' | 'admin';
  body?: S;
  /** [запросов, окно в секундах] на пользователя (или IP) */
  limit?: [number, number];
  /** разрешить заблокированным (например, чтение профиля для показа сообщения о блокировке) */
  allowBanned?: boolean;
  /** игнорировать режим техработ */
  ignoreMaintenance?: boolean;
};

const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export const errorResponse = (e: ApiError) =>
  json({ error: { code: e.code, message: e.message } }, e.status);

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export const idKey = z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/);
export const uuid = z.string().uuid();

export async function loadUser(uid: string): Promise<DbUser> {
  const rows = check(await db().from('users').select('*').eq('id', uid).limit(1)) as DbUser[];
  if (!rows[0]) throw new ApiError(401, 'unauthorized', 'Сессия недействительна');
  return rows[0];
}

export function route<S extends z.ZodTypeAny | undefined = undefined>(
  opts: Opts<S>,
  handler: (ctx: Ctx<S extends z.ZodTypeAny ? z.infer<S> : undefined>) => Promise<unknown | Response>,
) {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      const auth = opts.auth ?? 'user';

      // CSRF: изменяющие запросы обязаны нести кастомный заголовок (браузер не отправит его с чужого сайта без CORS preflight).
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.get('x-hu-client') !== '1') {
        throw new ApiError(403, 'csrf', 'Запрос отклонён');
      }

      const session = auth === 'none' ? null : await readSession(req);
      if (auth !== 'none' && !session) throw new ApiError(401, 'unauthorized', 'Требуется авторизация');

      const [limit, windowSec] = opts.limit ?? [90, 60];
      const rl = rateLimit(`${session?.uid ?? clientIp(req)}:${req.method}:${req.nextUrl.pathname}`, limit, windowSec);
      if (!rl.ok) {
        return json({ error: { code: 'rate_limited', message: 'Слишком много запросов, подождите немного' } }, 429, {
          'Retry-After': String(rl.retryAfter),
        });
      }

      let body: any = undefined;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw new ApiError(400, 'bad_json', 'Некорректный JSON');
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Некорректные данные');
        }
        body = parsed.data;
      }

      let user = undefined as unknown as DbUser;
      let isAdmin = false;
      if (session) {
        user = await loadUser(session.uid);
        isAdmin = isAdminTelegramId(user.telegram_id);
        if (user.is_banned && !opts.allowBanned) throw new ApiError(403, 'banned', user.ban_reason || 'Аккаунт заблокирован');
        if (auth === 'admin' && !isAdmin) throw new ApiError(403, 'forbidden', 'Недостаточно прав');
        if (!opts.ignoreMaintenance && !isAdmin) {
          const s = await getSettings();
          if (s.maintenance === true) throw new ApiError(503, 'maintenance', String(s.maintenance_message ?? 'Технические работы'));
        }
        if (Date.now() - new Date(user.last_seen_at).getTime() > 5 * 60_000) {
          void db().from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id).then(() => {});
        }
      }

      const params = (await routeCtx.params) ?? {};
      const out = await handler({ req, user, isAdmin, body, params, query: req.nextUrl.searchParams } as any);
      if (out instanceof Response) return out;
      return json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) return errorResponse(e);
      console.error('[api]', req.method, req.nextUrl.pathname, e);
      return json({ error: { code: 'internal', message: 'Внутренняя ошибка сервера' } }, 500);
    }
  };
}

export const pageParams = (q: URLSearchParams, defSize = 20) => {
  const page = Math.max(1, Math.min(10_000, Number(q.get('page')) || 1));
  const size = Math.max(1, Math.min(50, Number(q.get('size')) || defSize));
  return { page, size, from: (page - 1) * size, to: page * size - 1 };
};

export async function audit(
  actor: DbUser,
  action: string,
  targetType: string,
  targetId: string | null,
  diff: Record<string, unknown> = {},
) {
  check(
    await db().from('audit_log').insert({
      actor_user_id: actor.id,
      actor_telegram_id: actor.telegram_id,
      action,
      target_type: targetType,
      target_id: targetId,
      diff,
    }),
  );
}

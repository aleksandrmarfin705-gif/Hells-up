import { NextResponse } from 'next/server';
import { z } from 'zod';
import { route } from '@/lib/api';
import { env, isDemoAllowed } from '@/lib/env';
import { ApiError } from '@/lib/errors';
import { rpc } from '@/lib/supabase/admin';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import { InitDataError, validateInitData, type TelegramUser } from '@/lib/telegram/validate';

const body = z.object({ initData: z.string().max(4096).optional(), demo: z.boolean().optional() });

export const POST = route({ auth: 'none', body, limit: [20, 60] }, async ({ body }) => {
  let tg: TelegramUser;
  if (body.demo) {
    // Demo-вход доступен только в локальной разработке (DEMO_MODE=true и не production).
    if (!isDemoAllowed()) throw new ApiError(403, 'demo_disabled', 'Demo-режим отключён');
    tg = { id: 1000001, first_name: 'Demo', username: 'demo_user' };
  } else {
    if (!body.initData) throw new ApiError(400, 'validation', 'Нет данных Telegram');
    const token = env.botToken();
    if (!token) throw new ApiError(503, 'not_configured', 'Не задан TELEGRAM_BOT_TOKEN');
    try {
      tg = validateInitData(body.initData, token, env.initDataMaxAge()).user;
    } catch (e) {
      if (e instanceof InitDataError) throw new ApiError(401, 'bad_init_data', 'Не удалось подтвердить Telegram-подпись. Откройте приложение заново из Telegram.');
      throw e;
    }
  }

  const user = await rpc<any>('app_upsert_telegram_user', {
    p_tg: tg.id,
    p_username: tg.username ?? null,
    p_first: tg.first_name ?? null,
    p_last: tg.last_name ?? null,
    p_photo: tg.photo_url ?? null,
    p_lang: tg.language_code ?? null,
  });
  if (user.is_banned) throw new ApiError(403, 'banned', user.ban_reason || 'Аккаунт заблокирован');

  const token = await createSessionToken(user.id, Number(user.telegram_id));
  const res = NextResponse.json({ ok: true, token }, { headers: { 'Cache-Control': 'no-store' } });
  setSessionCookie(res, token);
  return res;
});

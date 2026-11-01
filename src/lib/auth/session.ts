import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { ApiError } from '@/lib/errors';

export const SESSION_COOKIE = 'hu_session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;
const isProd = () => process.env.NODE_ENV === 'production';

function secretKey(): Uint8Array {
  const s = env.sessionSecret();
  if (!s) throw new ApiError(503, 'not_configured', 'Не задан SESSION_SECRET (минимум 32 символа)');
  return new TextEncoder().encode(s);
}

export async function createSessionToken(userId: string, telegramId: number): Promise<string> {
  return new SignJWT({ tg: telegramId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secretKey());
}

export async function readSession(req: NextRequest): Promise<{ uid: string; tg: number } | null> {
  const bearer = req.headers.get('authorization');
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.tg !== 'number') return null;
    return { uid: payload.sub, tg: payload.tg };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return null;
  }
}

/** httpOnly-cookie. В production — SameSite=None; Secure; Partitioned, чтобы работать в Telegram Web (iframe). */
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'lax',
    partitioned: isProd(),
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: isProd(), sameSite: isProd() ? 'none' : 'lax', path: '/', maxAge: 0 });
}

/** Токен для Supabase Realtime (чат поддержки): JWT, подписанный секретом проекта, sub = наш user id. */
export async function createRealtimeToken(userId: string, isAdmin = false): Promise<string | null> {
  const secret = env.supabaseJwtSecret();
  if (!secret) return null;
  return new SignJWT({ role: 'authenticated', aud: 'authenticated', app_role: isAdmin ? 'admin' : 'user' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(new TextEncoder().encode(secret));
}

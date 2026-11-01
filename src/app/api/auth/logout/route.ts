import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth/session';

export const POST = route({ auth: 'none' }, async () => {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
});

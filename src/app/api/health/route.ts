import { NextResponse } from 'next/server';
import { configStatus } from '@/lib/env';
import { db } from '@/lib/supabase/admin';

/** Публичный статус подключения (без секретов): помогает показать понятное состояние «не настроено». */
export async function GET(req: Request) {
  const c = configStatus();
  const out: Record<string, unknown> = {
    ok: c.database && c.telegram && c.session,
    database: c.database,
    telegram: c.telegram,
    session: c.session,
    demoAvailable: c.demo && c.database,
  };

  // ?check=1 — реальная проверка связи с базой. Значения переменных не раскрываются, только категория ошибки.
  if (new URL(req.url).searchParams.get('check') === '1' && c.database) {
    try {
      const { error } = await db().from('settings').select('key').limit(1);
      out.dbCheck = error ? `error: ${String(error.message).slice(0, 120)}` : 'ok';
      if (!error) {
        const fn = await db().rpc('app_setting_int', { p_key: 'start_balance', p_default: 0 });
        out.rpcCheck = fn.error ? `error: ${String(fn.error.message).slice(0, 120)}` : 'ok';
      }
    } catch (e) {
      out.dbCheck = `exception: ${e instanceof Error ? e.message.slice(0, 120) : 'unknown'}`;
    }
  }
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}

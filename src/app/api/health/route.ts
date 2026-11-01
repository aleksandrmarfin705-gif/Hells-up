import { NextResponse } from 'next/server';
import { configStatus } from '@/lib/env';

/** Публичный статус подключения (без секретов): помогает показать понятное состояние «не настроено». */
export async function GET() {
  const c = configStatus();
  return NextResponse.json(
    { ok: c.database && c.telegram && c.session, database: c.database, telegram: c.telegram, session: c.session, demoAvailable: c.demo && c.database },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

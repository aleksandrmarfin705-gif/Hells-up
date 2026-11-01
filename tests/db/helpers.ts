import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../supabase');

/** Поднимает in-memory PostgreSQL (PGlite), эмулирует роли/auth Supabase и применяет миграции + seed. */
export async function createDb(withSeed = true) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.jwt() to anon, authenticated, service_role;
  `);
  const files = readdirSync(path.join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) await db.exec(readFileSync(path.join(root, 'migrations', f), 'utf8'));
  if (withSeed) await db.exec(readFileSync(path.join(root, 'seed.sql'), 'utf8'));
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

export async function one<T = any>(db: Db, sql: string, params: any[] = []): Promise<T> {
  const r = await db.query<T>(sql, params);
  return r.rows[0] as T;
}

export async function rpc<T = any>(db: Db, fn: string, ...args: any[]): Promise<T> {
  const ph = args.map((_, i) => `$${i + 1}`).join(', ');
  const r = await db.query<any>(`select public.${fn}(${ph}) as r`, args);
  return r.rows[0].r as T;
}

export async function makeUser(db: Db, tg = 1000 + Math.floor(Math.random() * 1e9), name = 'tester') {
  const u: any = await rpc(db, 'app_upsert_telegram_user', tg, name, 'Test', null, null, 'ru');
  return u as { id: string; balance: number; telegram_id: number };
}

export async function balanceOf(db: Db, id: string): Promise<number> {
  return Number((await one(db, 'select balance from public.users where id = $1', [id])).balance);
}

export async function expectError(p: Promise<unknown>, code: string) {
  try {
    await p;
  } catch (e: any) {
    if (!String(e.message).includes(code)) throw new Error(`Ожидалась ошибка «${code}», получено: ${e.message}`);
    return;
  }
  throw new Error(`Ожидалась ошибка «${code}», но операция прошла`);
}

let counter = 0;
export const key = () => `test-key-${Date.now()}-${++counter}-xxxxxxxx`;

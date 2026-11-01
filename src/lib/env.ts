import { randomBytes } from 'node:crypto';

/** Все секреты читаются только на сервере и только из process.env. */
const isProd = () => process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

let devSecret: string | undefined;

export const env = {
  supabaseUrl: () => process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  supabaseServiceKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  supabaseJwtSecret: () => process.env.SUPABASE_JWT_SECRET || undefined,
  botToken: () => process.env.TELEGRAM_BOT_TOKEN || undefined,
  initDataMaxAge: () => Math.max(60, Number(process.env.TELEGRAM_INITDATA_MAX_AGE) || 3600),
  sessionSecret: () => {
    const s = process.env.SESSION_SECRET;
    if (s && s.length >= 32) return s;
    if (!isProd() && process.env.DEMO_MODE === 'true') return (devSecret ??= randomBytes(32).toString('hex'));
    return undefined;
  },
  adminIds: (): number[] =>
    (process.env.ADMIN_TELEGRAM_IDS ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isSafeInteger(n) && n > 0),
};

/** demo-вход без Telegram: только при `next dev`, никогда в production/Vercel production. */
export const isDemoAllowed = () => process.env.DEMO_MODE === 'true' && !isProd();

export const isAdminTelegramId = (tg: number | string) => env.adminIds().includes(Number(tg));

export function configStatus() {
  return {
    database: Boolean(env.supabaseUrl() && env.supabaseServiceKey()),
    telegram: Boolean(env.botToken()),
    session: Boolean(env.sessionSecret()),
    realtimePublic: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    realtimePrivate: Boolean(env.supabaseJwtSecret()),
    admins: env.adminIds().length,
    demo: isDemoAllowed(),
  };
}

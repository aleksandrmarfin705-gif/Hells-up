import 'server-only';
import { db, check } from '@/lib/supabase/admin';
import type { PublicSettings } from '@/lib/types';

let cache: { at: number; data: Record<string, any> } | undefined;

export async function getSettings(): Promise<Record<string, any>> {
  if (cache && Date.now() - cache.at < 5000) return cache.data;
  const rows = check(await db().from('settings').select('key,value')) as { key: string; value: any }[];
  const data = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  cache = { at: Date.now(), data };
  return data;
}

export const invalidateSettings = () => {
  cache = undefined;
};

export const num = (v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSettings();
  return {
    app_name: String(s.app_name ?? 'HELLS UP'),
    topup_amount: num(s.topup_amount, 1000),
    topup_cooldown_seconds: num(s.topup_cooldown_seconds, 3600),
    roulette_enabled: s.roulette_enabled !== false,
    roulette_min_bet: num(s.roulette_min_bet, 10),
    roulette_max_bet: num(s.roulette_max_bet, 50000),
    blackjack_enabled: s.blackjack_enabled !== false,
    blackjack_min_bet: num(s.blackjack_min_bet, 10),
    blackjack_max_bet: num(s.blackjack_max_bet, 50000),
    cases_enabled: s.cases_enabled !== false,
    upgrade_enabled: s.upgrade_enabled !== false,
    upgrade_edge_bp: num(s.upgrade_edge_bp, 500),
    upgrade_max_chance_bp: num(s.upgrade_max_chance_bp, 9500),
    banner_title: String(s.banner_title ?? 'Поднимись из пепла'),
    banner_subtitle: String(s.banner_subtitle ?? ''),
    show_demo_events: s.show_demo_events !== false,
  };
}

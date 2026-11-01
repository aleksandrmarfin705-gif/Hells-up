import type { Page, Route } from '@playwright/test';

const RAR = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
const ARTS = ['coin', 'blade', 'skull', 'ring', 'potion', 'key', 'shield', 'gem', 'orb', 'crown', 'flame'];
const NAMES = ['Тёмная монета', 'Ржавый кинжал', 'Костяной талисман', 'Тусклое кольцо', 'Пепельный флакон', 'Железный ключ', 'Обугленный щит', 'Клинок тени', 'Багровый рубин', 'Корона пепла', 'Золотая корона', 'Сердце ада'];
export const items = NAMES.map((name, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, slug: `i${i}`, name, description: 'Демонстрационный предмет.',
  rarity: RAR[Math.min(5, Math.floor(i / 2))], art: ARTS[i % ARTS.length], image_url: null, virtual_price: [15, 25, 150, 260, 600, 1300, 2800, 4200, 12000, 20000, 75000, 100000][i], is_active: true,
}));
const accents = ['#9a8f7d', '#e0782b', '#8f7bd6', '#d1344a', '#4fb6c7', '#e8c55a', '#e2552b', '#f5d77a'];
export const caseList = ['Пепел', 'Угли', 'Тень', 'Багрянец', 'Обсидиан', 'Корона', 'Преисподняя', 'Владыка'].map((name, i) => ({
  id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, slug: name, name, description: 'Описание кейса для демонстрации.', price: [50, 120, 400, 900, 2800, 7000, 20000, 40000][i],
  accent: accents[i], art: ['chest', 'flame', 'relic', 'chest', 'relic', 'crown', 'flame', 'crown'][i], image_url: null, is_featured: i % 2 === 1, item_count: 8, top_item: items[11],
}));
const events = items.slice(4, 10).map((it, i) => ({ id: 'e' + i, kind: (['case', 'upgrade', 'roulette', 'blackjack'] as const)[i % 4], display_name: 'Ma***', title: `${it.name} из «Корона»`, rarity: it.rarity, amount: it.virtual_price, is_demo: true, created_at: new Date(Date.now() - i * 240000).toISOString() }));

export const me = (isAdmin = false) => ({
  user: { id: 'u1', telegram_id: 1000001, username: 'demo_user', first_name: 'Demo', last_name: null, photo_url: null, balance: 123456, created_at: '2026-01-10T10:00:00Z', last_topup_at: null },
  isAdmin, realtime: null,
  settings: { app_name: 'HELLS UP', topup_amount: 1000, topup_cooldown_seconds: 3600, roulette_enabled: true, roulette_min_bet: 10, roulette_max_bet: 50000, blackjack_enabled: true, blackjack_min_bet: 10, blackjack_max_bet: 50000, cases_enabled: true, upgrade_enabled: true, upgrade_edge_bp: 500, upgrade_max_chance_bp: 9500, banner_title: 'Поднимись из пепла', banner_subtitle: 'Открывай кейсы, улучшай предметы, играй в демо-режимах. Только виртуальные монеты.', show_demo_events: true },
});

const invItems = items.slice(0, 10).map((item, i) => ({ id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, status: 'owned', source: 'case', acquired_at: new Date(Date.now() - i * 3600000).toISOString(), item }));
const caseDetail = (id: string) => {
  const c = caseList.find((x) => x.id === id) ?? caseList[0];
  const weights = items.map((it) => Math.round(1e9 / it.virtual_price));
  const total = weights.reduce((a, b) => a + b, 0);
  return { case: { ...c, items: [...items].reverse().map((it, i) => ({ ...it, weight: weights[items.length - 1 - i], chance: weights[items.length - 1 - i] / total })) } };
};

type Opts = { admin?: boolean; notConfigured?: boolean; calls?: string[] };

export async function mockApi(page: Page, opts: Opts = {}) {
  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    opts.calls?.push(`${route.request().method()} ${p}`);
    const ok = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (p === '/api/health') return ok({ ok: !opts.notConfigured, database: !opts.notConfigured, telegram: false, session: true, demoAvailable: !opts.notConfigured });
    if (p === '/api/auth/telegram') return opts.notConfigured ? ok({ error: { code: 'not_configured', message: 'Supabase не подключён' } }, 503) : ok({ ok: true, token: 'e2e-token' });
    if (p === '/api/me') return ok(me(opts.admin));
    if (p === '/api/home') return ok({ popular: caseList.filter((c) => c.is_featured), newest: caseList.slice(-4), rareItems: items.slice(6), events });
    if (p === '/api/cases') return ok({ cases: caseList });
    const cm = p.match(/^\/api\/cases\/([^/]+)(\/open)?$/);
    if (cm && cm[2]) return ok({ opening_id: 'o1', user_item_id: 'ui1', item: items[8], balance: 123000, price_paid: 900, roll: 0.5, fair: { server_seed_hash: 'a'.repeat(64), client_seed: 'abc', nonce: 1 } });
    if (cm) return ok(caseDetail(cm[1]));
    if (p === '/api/inventory') return ok({ items: invItems });
    if (p === '/api/items') return ok({ items });
    if (p === '/api/history') {
      const type = url.searchParams.get('type');
      const rows = type === 'balance' ? [
        { id: 't1', type: 'topup', amount: 1000, balance_after: 6000, meta: {}, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 't2', type: 'case_open', amount: -900, balance_after: 5100, meta: {}, created_at: new Date(Date.now() - 1800000).toISOString() },
        { id: 't3', type: 'welcome', amount: 5000, balance_after: 5000, meta: {}, created_at: new Date(Date.now() - 86400000).toISOString() },
      ] : [];
      return ok({ type, page: 1, size: 15, total: rows.length, rows });
    }
    if (p === '/api/profile') return ok({ stats: { cases_opened: 42, items_owned: 10, inventory_value: 9999, upgrades_total: 5, upgrades_won: 2, roulette_bets: 12, roulette_wins: 5, blackjack_games: 9, blackjack_wins: 4, total_spent: 20000, total_won: 18000 } });
    if (p === '/api/roulette/state') {
      const now = Date.now();
      return ok({ serverTime: now, round: { id: 'r1', round_no: 128, status: 'betting', server_seed_hash: 'b'.repeat(64), starts_at: new Date(now - 10000).toISOString(), ends_at: new Date(now + 20000).toISOString() },
        bets: [{ id: 'b1', display_name: 'Al***', bet_type: 'red', bet_value: null, amount: 500, payout: null, mine: false }, { id: 'b2', display_name: 'Вы', bet_type: 'number', bet_value: 17, amount: 100, payout: null, mine: true }],
        last: [{ id: 'r0', round_no: 127, result: 17, result_color: 'black', server_seed_hash: 'c'.repeat(64), revealed_seed: 'seed' }, { id: 'r00', round_no: 126, result: 0, result_color: 'green', server_seed_hash: 'd'.repeat(64), revealed_seed: 'seed' }, { id: 'r000', round_no: 125, result: 32, result_color: 'red', server_seed_hash: 'e'.repeat(64), revealed_seed: 'seed' }] });
    }
    if (p === '/api/roulette/history') return ok({ mine: [] });
    if (p === '/api/blackjack') return ok({ game: { id: 'g1', bet: 100, status: 'active', outcome: null, payout: null, version: 1, view: { player: [9, 25], dealer: [12], dealerHidden: true, playerTotal: 20, dealerTotal: 10, canDouble: false }, fair: { server_seed_hash: 'f'.repeat(64), client_seed: 'x', nonce: 3 } }, recent: [] });
    if (p === '/api/fair') return ok({ active: { id: 's1', server_seed_hash: 'a'.repeat(64), client_seed: 'abcdef', nonce: 12 }, revealed: [] });
    if (p === '/api/support/threads') return ok({ threads: [{ id: 't1', subject: 'Не пришёл бонус', status: 'open', last_message_at: new Date().toISOString() }] });
    if (p.startsWith('/api/admin/stats')) return ok({ stats: { users_total: 120, users_active_24h: 34, users_banned: 1, case_openings: 980, upgrades: 210, roulette_bets: 1500, roulette_rounds: 300, blackjack_games: 400, game_operations: 3090, balance_total: 5000000, inventory_value_total: 8000000, coins_spent_cases: 2000000, open_support_threads: 3 } });
    if (p.startsWith('/api/admin/users')) return ok({ rows: [{ id: 'u1', telegram_id: 1000001, username: 'demo_user', first_name: 'Demo', last_name: null, balance: 5000, is_banned: false, created_at: new Date().toISOString(), last_seen_at: new Date().toISOString() }], total: 1 });
    if (p === '/api/admin/cases') return ok({ cases: caseList.map((c) => ({ ...c, is_active: true, sort_order: 1, expected_value: Math.round(c.price * 0.94), rtp: 0.94 })) });
    if (p === '/api/admin/items') return ok({ items });
    if (p === '/api/admin/settings') return ok({ settings: { app_name: 'HELLS UP', start_balance: 5000, topup_amount: 1000, topup_cooldown_seconds: 3600, maintenance: false, maintenance_message: 'Работы', banner_title: 'T', banner_subtitle: 'S', show_demo_events: true, upgrade_edge_bp: 500, upgrade_max_chance_bp: 9500, roulette_enabled: true, roulette_round_seconds: 30, roulette_min_bet: 10, roulette_max_bet: 50000, blackjack_enabled: true, blackjack_min_bet: 10, blackjack_max_bet: 50000, cases_enabled: true, upgrade_enabled: true } });
    if (p === '/api/admin/games') return ok({ openings: [], upgrades: [], bets: [], blackjack: [], rounds: [] });
    if (p === '/api/admin/audit') return ok({ rows: [], total: 0 });
    if (p === '/api/admin/support') return ok({ threads: [] });
    return ok({ ok: true });
  });
}

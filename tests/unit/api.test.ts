import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signInitDataForTests } from '@/lib/telegram/validate';

// ---- Мок слоя БД: фиксируем, какие фильтры применяет API ----
const state = vi.hoisted(() => ({
  users: {} as Record<string, any>,
  settings: [] as { key: string; value: any }[],
  calls: [] as { table: string; op: string; args: any[] }[],
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => {
  const builder = (table: string) => {
    const filters: Record<string, any> = {};
    const p: any = new Proxy(function () {}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          const rows = (() => {
            if (table === 'users') return filters.id && state.users[filters.id] ? [state.users[filters.id]] : [];
            if (table === 'settings') return state.settings;
            return [];
          })();
          return (res: any) => res({ data: rows, error: null, count: rows.length });
        }
        return (...args: any[]) => {
          state.calls.push({ table, op: prop, args });
          if (prop === 'eq') filters[args[0]] = args[1];
          return p;
        };
      },
    });
    return p;
  };
  return {
    db: () => ({ from: (t: string) => builder(t) }),
    rpc: (fn: string, args: any) => state.rpc(fn, args),
    check: (r: any) => r.data,
  };
});

import { createSessionToken } from '@/lib/auth/session';
import { invalidateSettings } from '@/lib/settings';
import { GET as adminStats } from '@/app/api/admin/stats/route';
import { POST as adminBalance } from '@/app/api/admin/users/[id]/balance/route';
import { GET as inventory } from '@/app/api/inventory/route';
import { POST as bet } from '@/app/api/roulette/bet/route';
import { POST as sell } from '@/app/api/inventory/sell/route';
import { POST as openCase } from '@/app/api/cases/[id]/open/route';
import { POST as authTg } from '@/app/api/auth/telegram/route';
import { GET as me } from '@/app/api/me/route';

const BOT = '123456:TEST_TOKEN_not_real_but_long_enough_xxxxx';
const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ADMIN_UID = '33333333-3333-4333-8333-333333333333';
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

const mkUser = (id: string, tg: number, extra: Record<string, any> = {}) => ({
  id, telegram_id: tg, username: 'u' + tg, first_name: 'N', last_name: null, photo_url: null, balance: 1000,
  is_banned: false, ban_reason: null, last_topup_at: null, last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), ...extra,
});

async function req(path: string, opts: { method?: string; uid?: string; tg?: number; body?: unknown; csrf?: boolean; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.uid) headers.authorization = `Bearer ${await createSessionToken(opts.uid, opts.tg ?? 1)}`;
  if (opts.csrf !== false && (opts.method ?? 'GET') !== 'GET') headers['x-hu-client'] = '1';
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  return new NextRequest(`http://localhost${path}`, { method: opts.method ?? 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
}
const json = async (r: Response) => ({ status: r.status, body: await r.json() });

beforeEach(() => {
  Object.assign(process.env, { SESSION_SECRET: 'x'.repeat(48), TELEGRAM_BOT_TOKEN: BOT, ADMIN_TELEGRAM_IDS: '777', DEMO_MODE: 'false', NODE_ENV: 'test' });
  state.users = { [UID]: mkUser(UID, 100), [OTHER]: mkUser(OTHER, 200), [ADMIN_UID]: mkUser(ADMIN_UID, 777) };
  state.settings = [{ key: 'maintenance', value: false }];
  state.calls = [];
  state.rpc.mockReset();
  invalidateSettings();
});

describe('аутентификация и права', () => {
  it('без сессии → 401', async () => {
    expect((await json(await inventory(await req('/api/inventory'), ctx()))).status).toBe(401);
    expect((await json(await adminStats(await req('/api/admin/stats'), ctx()))).status).toBe(401);
  });

  it('подделанный токен (другой секрет) → 401', async () => {
    const good = await createSessionToken(UID, 100);
    process.env.SESSION_SECRET = 'y'.repeat(48);
    const r = new NextRequest('http://localhost/api/inventory', { headers: { authorization: `Bearer ${good}` } });
    expect((await inventory(r, ctx())).status).toBe(401);
  });

  it('обычный пользователь не может открыть админ-маршруты → 403', async () => {
    const r = await json(await adminStats(await req('/api/admin/stats', { uid: UID, tg: 100 }), ctx()));
    expect(r.status).toBe(403);
    expect(state.rpc).not.toHaveBeenCalled();
    const b = await json(await adminBalance(await req(`/api/admin/users/${OTHER}/balance`, { method: 'POST', uid: UID, tg: 100, body: { delta: 999999, reason: 'хочу денег' } }), ctx({ id: OTHER })));
    expect(b.status).toBe(403);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('роль берётся из ADMIN_TELEGRAM_IDS, а не из токена/БД: админ проходит', async () => {
    state.rpc.mockResolvedValue({ users_total: 1 });
    const r = await json(await adminStats(await req('/api/admin/stats', { uid: ADMIN_UID, tg: 777 }), ctx()));
    expect(r.status).toBe(200);
    expect(r.body.stats.users_total).toBe(1);
    // тот же пользователь, но id убран из списка администраторов → доступ закрыт мгновенно
    process.env.ADMIN_TELEGRAM_IDS = '999';
    expect((await adminStats(await req('/api/admin/stats', { uid: ADMIN_UID, tg: 777 }), ctx())).status).toBe(403);
  });

  it('корректировка баланса админом вызывает RPC с id актора и валидирует вход', async () => {
    state.rpc.mockResolvedValue({ balance: 1500 });
    const ok = await adminBalance(await req(`/api/admin/users/${UID}/balance`, { method: 'POST', uid: ADMIN_UID, tg: 777, body: { delta: 500, reason: 'бонус' } }), ctx({ id: UID }));
    expect(ok.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('admin_adjust_balance', expect.objectContaining({ p_actor: ADMIN_UID, p_actor_tg: 777, p_target: UID, p_delta: 500 }));
    const zero = await adminBalance(await req(`/api/admin/users/${UID}/balance`, { method: 'POST', uid: ADMIN_UID, tg: 777, body: { delta: 0, reason: 'бонус' } }), ctx({ id: UID }));
    expect(zero.status).toBe(400);
    const noReason = await adminBalance(await req(`/api/admin/users/${UID}/balance`, { method: 'POST', uid: ADMIN_UID, tg: 777, body: { delta: 5, reason: '' } }), ctx({ id: UID }));
    expect(noReason.status).toBe(400);
  });

  it('заблокированный пользователь → 403', async () => {
    state.users[UID].is_banned = true;
    const r = await json(await inventory(await req('/api/inventory', { uid: UID, tg: 100 }), ctx()));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('banned');
  });

  it('техработы: обычным → 503, администратору доступ сохраняется', async () => {
    state.settings = [{ key: 'maintenance', value: true }, { key: 'maintenance_message', value: 'Скоро вернёмся' }];
    const u = await json(await inventory(await req('/api/inventory', { uid: UID, tg: 100 }), ctx()));
    expect(u.status).toBe(503);
    expect(u.body.error.code).toBe('maintenance');
    state.rpc.mockResolvedValue({});
    const a = await adminStats(await req('/api/admin/stats', { uid: ADMIN_UID, tg: 777 }), ctx());
    expect(a.status).toBe(200);
  });
});

describe('защита данных и операций', () => {
  it('инвентарь запрашивается только по user_id из сессии (нет доступа к чужому)', async () => {
    await inventory(await req('/api/inventory?user_id=' + OTHER, { uid: UID, tg: 100 }), ctx());
    const eqs = state.calls.filter((c) => c.table === 'user_items' && c.op === 'eq').map((c) => c.args);
    expect(eqs).toContainEqual(['user_id', UID]);
    expect(eqs.flat()).not.toContain(OTHER);
  });

  it('изменяющий запрос без CSRF-заголовка → 403, RPC не вызывается', async () => {
    const r = await sell(await req('/api/inventory/sell', { method: 'POST', uid: UID, tg: 100, csrf: false, body: { userItemId: OTHER, key: 'abcdefgh12' } }), ctx());
    expect(r.status).toBe(403);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('клиент не может подсунуть результат или цену: лишние поля отбрасываются, в RPC уходит только user из сессии', async () => {
    state.rpc.mockResolvedValue({ balance: 900, bet_id: 'b' });
    const round = '44444444-4444-4444-8444-444444444444';
    const r = await bet(await req('/api/roulette/bet', { method: 'POST', uid: UID, tg: 100, body: { roundId: round, type: 'red', amount: 100, key: 'abcdefgh12', userId: OTHER, payout: 99999, result: 7 } }), ctx());
    expect(r.status).toBe(200);
    const [fn, args] = state.rpc.mock.calls[0];
    expect(fn).toBe('roulette_place_bet');
    expect(args.p_user).toBe(UID);
    expect(JSON.stringify(args)).not.toContain('99999');
    expect(JSON.stringify(args)).not.toContain(OTHER);
  });

  it('валидация Zod: ставка на число без числа, отрицательная сумма, плохой ключ → 400', async () => {
    const round = '44444444-4444-4444-8444-444444444444';
    const mk = async (body: any) => (await bet(await req('/api/roulette/bet', { method: 'POST', uid: UID, tg: 100, body }), ctx())).status;
    expect(await mk({ roundId: round, type: 'number', amount: 10, key: 'abcdefgh12' })).toBe(400);
    expect(await mk({ roundId: round, type: 'red', value: 3, amount: 10, key: 'abcdefgh12' })).toBe(400);
    expect(await mk({ roundId: round, type: 'red', amount: -10, key: 'abcdefgh12' })).toBe(400);
    expect(await mk({ roundId: round, type: 'red', amount: 1.5, key: 'abcdefgh12' })).toBe(400);
    expect(await mk({ roundId: round, type: 'hack', amount: 10, key: 'abcdefgh12' })).toBe(400);
    expect(await mk({ roundId: round, type: 'red', amount: 10, key: 'x' })).toBe(400);
    expect(await mk({ roundId: 'not-a-uuid', type: 'red', amount: 10, key: 'abcdefgh12' })).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('открытие кейса: сервер сам определяет roll (клиентский roll игнорируется)', async () => {
    const caseId = '55555555-5555-4555-8555-555555555555';
    state.rpc.mockImplementation(async (fn: string) => {
      if (fn === 'fair_take_nonce') return { seed_id: 's', server_seed: 'secret', server_seed_hash: 'h', client_seed: 'c', nonce: 1 };
      return { opening_id: 'o', item: { id: 'i' }, balance: 1, roll: 0.5 };
    });
    const r = await json(await openCase(await req(`/api/cases/${caseId}/open`, { method: 'POST', uid: UID, tg: 100, body: { key: 'abcdefgh12', roll: 0, item: 'mythic' } }), ctx({ id: caseId })));
    expect(r.status).toBe(200);
    const open = state.rpc.mock.calls.find((c) => c[0] === 'open_case')!;
    expect(open[1].p_roll).toBeGreaterThan(0); // не 0 из тела запроса
    expect(JSON.stringify(r.body)).not.toContain('secret'); // server_seed не раскрывается
  });

  it('ошибки БД превращаются в понятные ответы без утечки внутренностей', async () => {
    const { ApiError } = await import('@/lib/errors');
    state.rpc.mockRejectedValue(new ApiError(400, 'insufficient_balance', 'Недостаточно монет'));
    const r = await json(await sell(await req('/api/inventory/sell', { method: 'POST', uid: UID, tg: 100, body: { userItemId: OTHER, key: 'abcdefgh12' } }), ctx()));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('insufficient_balance');
  });

  it('rate limit: после превышения лимита → 429', async () => {
    state.rpc.mockResolvedValue({});
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await sell(await req('/api/inventory/sell', { method: 'POST', uid: ADMIN_UID, tg: 777, body: { userItemId: OTHER, key: 'abcdefgh12' } }), ctx())).status;
    // лимит sell — 40/мин, поэтому дожимаем
    for (let i = 0; i < 40; i++) last = (await sell(await req('/api/inventory/sell', { method: 'POST', uid: ADMIN_UID, tg: 777, body: { userItemId: OTHER, key: 'abcdefgh12' } }), ctx())).status;
    expect(last).toBe(429);
  });
});

describe('Telegram-авторизация', () => {
  const user = JSON.stringify({ id: 4242, first_name: 'Ann', username: 'ann' });
  const fresh = () => signInitDataForTests({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'Q', user }, BOT);

  it('валидный initData → сессия в httpOnly cookie, пользователь создаётся через RPC', async () => {
    state.rpc.mockResolvedValue({ id: UID, telegram_id: 4242, is_banned: false });
    const res = await authTg(await req('/api/auth/telegram', { method: 'POST', body: { initData: fresh() } }), ctx());
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/hu_session=/);
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(state.rpc).toHaveBeenCalledWith('app_upsert_telegram_user', expect.objectContaining({ p_tg: 4242, p_username: 'ann' }));
  });

  it('подделанный initData → 401, пользователь не создаётся', async () => {
    const forged = fresh().replace(encodeURIComponent('"id":4242'), encodeURIComponent('"id":777'));
    const r = await json(await authTg(await req('/api/auth/telegram', { method: 'POST', body: { initData: forged } }), ctx()));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('bad_init_data');
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('просроченный initData → 401', async () => {
    const old = signInitDataForTests({ auth_date: String(Math.floor(Date.now() / 1000) - 7200), user }, BOT);
    expect((await authTg(await req('/api/auth/telegram', { method: 'POST', body: { initData: old } }), ctx())).status).toBe(401);
  });

  it('demo-режим отключён по умолчанию и в production даже при DEMO_MODE=true', async () => {
    expect((await authTg(await req('/api/auth/telegram', { method: 'POST', body: { demo: true } }), ctx())).status).toBe(403);
    process.env.DEMO_MODE = 'true';
    (process.env as any).NODE_ENV = 'production';
    expect((await authTg(await req('/api/auth/telegram', { method: 'POST', body: { demo: true } }), ctx())).status).toBe(403);
    (process.env as any).NODE_ENV = 'test';
    state.rpc.mockResolvedValue({ id: UID, telegram_id: 1000001, is_banned: false });
    expect((await authTg(await req('/api/auth/telegram', { method: 'POST', body: { demo: true } }), ctx())).status).toBe(200);
  });

  it('без TELEGRAM_BOT_TOKEN → 503 not_configured (а не ложный успех)', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const r = await json(await authTg(await req('/api/auth/telegram', { method: 'POST', body: { initData: fresh() } }), ctx()));
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('not_configured');
  });

  it('/api/me не отдаёт секреты', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret-value';
    const r = await me(await req('/api/me', { uid: UID, tg: 100 }), ctx());
    const text = JSON.stringify(await r.json());
    expect(text).not.toContain('service-role-secret-value');
    expect(text).not.toContain(BOT);
    expect(text).not.toContain('is_banned');
  });
});

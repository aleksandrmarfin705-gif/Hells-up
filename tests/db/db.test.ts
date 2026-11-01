import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, one, rpc, makeUser, balanceOf, expectError, key, type Db } from './helpers';
import { createHash } from 'node:crypto';

let db: Db;
beforeAll(async () => {
  db = await createDb();
});

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

async function seedFor(userId: string) {
  await rpc(db, 'fair_ensure_seed', userId, 'serverseed-' + userId, sha('serverseed-' + userId), 'client');
  return rpc<any>(db, 'fair_take_nonce', userId);
}

describe('seed-данные', () => {
  it('содержит ≥8 кейсов и ≥30 предметов, у каждого кейса есть состав', async () => {
    expect(Number((await one(db, 'select count(*) c from public.cases')).c)).toBeGreaterThanOrEqual(8);
    expect(Number((await one(db, 'select count(*) c from public.items')).c)).toBeGreaterThanOrEqual(30);
    const empty = await one(db, `select count(*) c from public.cases c where not exists
      (select 1 from public.case_items ci where ci.case_id = c.id)`);
    expect(Number(empty.c)).toBe(0);
    const rarities = await db.query('select distinct rarity from public.items');
    expect(rarities.rows.length).toBe(6);
  });

  it('цена кейса даёт возврат ~90–98% (экономика не инфляционная)', async () => {
    const rows = (
      await db.query<any>(`select c.slug, c.price,
        sum(i.virtual_price::numeric * ci.weight) / sum(ci.weight) as ev
        from public.cases c join public.case_items ci on ci.case_id = c.id
        join public.items i on i.id = ci.item_id group by c.id`)
    ).rows;
    for (const r of rows) {
      const rtp = Number(r.ev) / Number(r.price);
      expect(rtp, r.slug).toBeGreaterThan(0.88);
      expect(rtp, r.slug).toBeLessThan(0.99);
    }
  });

  it('seed идемпотентен', async () => {
    const { readFileSync } = await import('node:fs');
    const before = Number((await one(db, 'select count(*) c from public.case_items')).c);
    await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
    expect(Number((await one(db, 'select count(*) c from public.case_items')).c)).toBe(before);
  });
});

describe('пользователи и баланс', () => {
  it('создаёт пользователя со стартовым балансом и записью в журнале; повторный вход не дублирует', async () => {
    const u = await makeUser(db, 555001);
    expect(Number(u.balance)).toBe(5000);
    const again: any = await rpc(db, 'app_upsert_telegram_user', 555001, 'new_name', 'T', null, null, 'ru');
    expect(again.id).toBe(u.id);
    expect(again.username).toBe('new_name');
    const tx = await db.query(`select * from public.transactions where user_id = $1 and type = 'welcome'`, [u.id]);
    expect(tx.rows.length).toBe(1);
  });

  it('баланс не может стать отрицательным (CHECK + проверка в функции)', async () => {
    const u = await makeUser(db);
    await expect(db.query('update public.users set balance = -1 where id = $1', [u.id])).rejects.toThrow();
  });

  it('демо-пополнение: работает и соблюдает cooldown', async () => {
    const u = await makeUser(db);
    const r: any = await rpc(db, 'claim_topup', u.id);
    expect(Number(r.balance)).toBe(6000);
    await expectError(rpc(db, 'claim_topup', u.id), 'topup_cooldown');
  });

  it('забаненный пользователь не может совершать операции', async () => {
    const u = await makeUser(db);
    await db.query('update public.users set is_banned = true where id = $1', [u.id]);
    await expectError(rpc(db, 'claim_topup', u.id), 'user_banned');
  });

  it('admin_adjust_balance пишет аудит и не уводит баланс в минус', async () => {
    const admin = await makeUser(db);
    const u = await makeUser(db);
    const r: any = await rpc(db, 'admin_adjust_balance', admin.id, 1, u.id, 250, 'тест');
    expect(Number(r.balance)).toBe(5250);
    await expectError(rpc(db, 'admin_adjust_balance', admin.id, 1, u.id, -999999, 'x'), 'insufficient_balance');
    const log = await db.query(`select * from public.audit_log where action = 'user.balance_adjust' and target_id = $1`, [u.id]);
    expect(log.rows.length).toBe(1);
    expect(Number(await balanceOf(db, u.id))).toBe(5250);
  });
});

describe('кейсы', () => {
  it('атомарно списывает цену, выдаёт предмет, пишет журнал', async () => {
    const u = await makeUser(db);
    const c = await one<any>(db, `select id, price from public.cases where slug = 'ash'`);
    const s = await seedFor(u.id);
    const res: any = await rpc(db, 'open_case', u.id, c.id, 0.5, s.seed_id, s.nonce, key());
    expect(Number(res.balance)).toBe(5000 - Number(c.price));
    expect(res.item.id).toBeTruthy();
    const inv = await db.query(`select * from public.user_items where user_id = $1 and status = 'owned'`, [u.id]);
    expect(inv.rows.length).toBe(1);
    const tx = await db.query<any>(`select amount from public.transactions where user_id = $1 and type = 'case_open'`, [u.id]);
    expect(Number(tx.rows[0].amount)).toBe(-Number(c.price));
    const op = await one<any>(db, 'select * from public.case_openings where user_id = $1', [u.id]);
    expect(op.server_seed_hash).toBe(sha('serverseed-' + u.id));
    expect(op.odds.length).toBeGreaterThan(1);
  });

  it('идемпотентность: повтор с тем же ключом не списывает деньги второй раз', async () => {
    const u = await makeUser(db);
    const c = await one<any>(db, `select id, price from public.cases where slug = 'ash'`);
    const s = await seedFor(u.id);
    const k = key();
    const a: any = await rpc(db, 'open_case', u.id, c.id, 0.1, s.seed_id, s.nonce, k);
    const b: any = await rpc(db, 'open_case', u.id, c.id, 0.9, s.seed_id, s.nonce, k);
    expect(b.opening_id).toBe(a.opening_id);
    expect(Number(await balanceOf(db, u.id))).toBe(5000 - Number(c.price));
    expect(Number((await one(db, 'select count(*) c from public.user_items where user_id = $1', [u.id])).c)).toBe(1);
  });

  it('выбор предмета детерминирован по roll и весам', async () => {
    const u = await makeUser(db);
    const c = await one<any>(db, `select id from public.cases where slug = 'ash'`);
    const s = await seedFor(u.id);
    const lo: any = await rpc(db, 'open_case', u.id, c.id, 0, s.seed_id, s.nonce, key());
    const hi: any = await rpc(db, 'open_case', u.id, c.id, 0.999999, s.seed_id, s.nonce, key());
    // самый частый предмет (наименьшая цена) при roll=0, самый редкий при roll→1
    expect(Number(lo.item.virtual_price)).toBeLessThan(Number(hi.item.virtual_price));
  });

  it('недостаточно средств — ошибка, ничего не меняется', async () => {
    const u = await makeUser(db);
    await db.query('update public.users set balance = 1 where id = $1', [u.id]);
    const c = await one<any>(db, `select id from public.cases where slug = 'lord'`);
    const s = await seedFor(u.id);
    await expectError(rpc(db, 'open_case', u.id, c.id, 0.5, s.seed_id, s.nonce, key()), 'insufficient_balance');
    expect(await balanceOf(db, u.id)).toBe(1);
    expect(Number((await one(db, 'select count(*) c from public.user_items where user_id = $1', [u.id])).c)).toBe(0);
  });

  it('отключённый кейс открыть нельзя', async () => {
    const u = await makeUser(db);
    const c = await one<any>(db, `select id from public.cases where slug = 'embers'`);
    await db.query('update public.cases set is_active = false where id = $1', [c.id]);
    const s = await seedFor(u.id);
    await expectError(rpc(db, 'open_case', u.id, c.id, 0.5, s.seed_id, s.nonce, key()), 'case_not_found');
    await db.query('update public.cases set is_active = true where id = $1', [c.id]);
  });

  it('параллельные открытия не уводят баланс в минус', async () => {
    const u = await makeUser(db);
    const c = await one<any>(db, `select id, price from public.cases where slug = 'crimson'`);
    await db.query('update public.users set balance = $2 where id = $1', [u.id, Number(c.price) * 2]);
    const s = await seedFor(u.id);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => rpc(db, 'open_case', u.id, c.id, 0.4, s.seed_id, s.nonce, key())),
    );
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(2);
    expect(await balanceOf(db, u.id)).toBe(0);
  });
});

describe('инвентарь и продажа', () => {
  it('продажа возвращает virtual_price, предмет нельзя продать дважды', async () => {
    const u = await makeUser(db);
    const c = await one<any>(db, `select id from public.cases where slug = 'ash'`);
    const s = await seedFor(u.id);
    const o: any = await rpc(db, 'open_case', u.id, c.id, 0.5, s.seed_id, s.nonce, key());
    const before = await balanceOf(db, u.id);
    const sold: any = await rpc(db, 'sell_item', u.id, o.user_item_id, key());
    expect(Number(sold.balance)).toBe(before + Number(o.item.virtual_price));
    await expectError(rpc(db, 'sell_item', u.id, o.user_item_id, key()), 'item_not_found');
  });

  it('нельзя продать чужой предмет', async () => {
    const a = await makeUser(db);
    const b = await makeUser(db);
    const c = await one<any>(db, `select id from public.cases where slug = 'ash'`);
    const s = await seedFor(a.id);
    const o: any = await rpc(db, 'open_case', a.id, c.id, 0.5, s.seed_id, s.nonce, key());
    await expectError(rpc(db, 'sell_item', b.id, o.user_item_id, key()), 'item_not_found');
  });
});

describe('upgrade', () => {
  async function give(userId: string, slug: string) {
    const ui = await one<any>(db, `insert into public.user_items (user_id, item_id, source)
      select $1, id, 'admin' from public.items where slug = $2 returning id`, [userId, slug]);
    return ui.id as string;
  }

  it('шанс считается по ценам с учётом edge и ограничивается максимумом', async () => {
    const r: any = await one(db, 'select public.upgrade_chance_bp(100, 200) a, public.upgrade_chance_bp(100, 101) b, public.upgrade_chance_bp(1, 1000000) c');
    expect(r.a).toBe(4750); // 100/200 * 0.95
    expect(r.b).toBe(9405);
    expect(r.c).toBe(0);
    expect((await one<any>(db, 'select public.upgrade_chance_bp(100, 100) a')).a).toBe(9500);
  });

  it('успех: предмет потрачен, выдана цель; неудача: предмет потерян', async () => {
    const u = await makeUser(db);
    const s = await seedFor(u.id);
    const target = await one<any>(db, `select id from public.items where slug = 'shadow-blade'`);
    const win = await give(u.id, 'iron-key'); // 60 -> 150: шанс 38%
    const ok: any = await rpc(db, 'do_upgrade', u.id, win, target.id, 0.1, s.seed_id, s.nonce, key());
    expect(ok.success).toBe(true);
    expect(ok.chance_bp).toBe(3800);
    expect(ok.user_item_id).toBeTruthy();
    const lose = await give(u.id, 'iron-key');
    const bad: any = await rpc(db, 'do_upgrade', u.id, lose, target.id, 0.99, s.seed_id, s.nonce, key());
    expect(bad.success).toBe(false);
    const st = await one<any>(db, 'select status from public.user_items where id = $1', [lose]);
    expect(st.status).toBe('consumed');
    await expectError(rpc(db, 'do_upgrade', u.id, lose, target.id, 0.1, s.seed_id, s.nonce, key()), 'item_not_found');
  });

  it('нельзя улучшать до более дешёвого предмета и до слишком дорогого', async () => {
    const u = await makeUser(db);
    const s = await seedFor(u.id);
    const it = await give(u.id, 'shadow-blade');
    const cheap = await one<any>(db, `select id from public.items where slug = 'iron-key'`);
    const huge = await one<any>(db, `select id from public.items where slug = 'eternity-blade'`);
    await expectError(rpc(db, 'do_upgrade', u.id, it, cheap.id, 0.1, s.seed_id, s.nonce, key()), 'invalid_target');
    await expectError(rpc(db, 'do_upgrade', u.id, it, huge.id, 0.1, s.seed_id, s.nonce, key()), 'chance_too_low');
  });
});

describe('рулетка', () => {
  const seed = 'roulette-seed-1';
  async function newRound() {
    await db.query(`update public.roulette_rounds set status = 'settled', result = 0, result_color = 'green' where status = 'betting'`);
    return rpc<any>(db, 'roulette_open_round', seed, sha(seed), 30);
  }

  it('открывает только один раунд ставок одновременно', async () => {
    const a = await newRound();
    const b: any = await rpc(db, 'roulette_open_round', 'other', sha('other'), 30);
    expect(b.id).toBe(a.id);
  });

  it('ставка списывается, выигрыш начисляется, секрет раскрывается и сверяется с хэшем', async () => {
    const r = await newRound();
    const u = await makeUser(db);
    const loser = await makeUser(db);
    await rpc(db, 'roulette_place_bet', u.id, r.id, 'red', null, 100, key());
    await rpc(db, 'roulette_place_bet', u.id, r.id, 'number', 32, 10, key());
    await rpc(db, 'roulette_place_bet', loser.id, r.id, 'black', null, 500, key());
    expect(await balanceOf(db, u.id)).toBe(4890);
    await expectError(rpc(db, 'roulette_settle', r.id, 32, seed), 'round_not_finished');
    await db.query(`update public.roulette_rounds set ends_at = now() - interval '1 second' where id = $1`, [r.id]);
    await expectError(rpc(db, 'roulette_settle', r.id, 32, 'wrong-seed'), 'seed_mismatch');
    const done: any = await rpc(db, 'roulette_settle', r.id, 32, seed); // 32 — красное
    expect(done.round.result_color).toBe('red');
    expect(await balanceOf(db, u.id)).toBe(4890 + 200 + 360);
    expect(await balanceOf(db, loser.id)).toBe(4500);
    const again: any = await rpc(db, 'roulette_settle', r.id, 5, seed);
    expect(again.already).toBe(true);
    expect(Number((await one(db, 'select count(*) c from public.roulette_round_secrets where round_id = $1', [r.id])).c)).toBe(0);
  });

  it('ставки после закрытия раунда, вне лимитов и с невалидным типом отклоняются', async () => {
    const r = await newRound();
    const u = await makeUser(db);
    await expectError(rpc(db, 'roulette_place_bet', u.id, r.id, 'red', null, 1, key()), 'invalid_amount');
    await expectError(rpc(db, 'roulette_place_bet', u.id, r.id, 'red', null, 99999999, key()), 'invalid_amount');
    await expectError(rpc(db, 'roulette_place_bet', u.id, r.id, 'red', 5, 100, key()), 'invalid_bet');
    await db.query(`update public.roulette_rounds set ends_at = now() - interval '1 second' where id = $1`, [r.id]);
    await expectError(rpc(db, 'roulette_place_bet', u.id, r.id, 'red', null, 100, key()), 'round_closed');
    expect(await balanceOf(db, u.id)).toBe(5000);
  });

  it('таблица выплат', async () => {
    const p = async (t: string, v: number | null, res: number) =>
      Number((await one<any>(db, 'select public.roulette_payout($1,$2,100,$3) p', [t, v, res])).p);
    expect(await p('red', null, 1)).toBe(200);
    expect(await p('black', null, 1)).toBe(0);
    expect(await p('red', null, 0)).toBe(0);
    expect(await p('even', null, 0)).toBe(0);
    expect(await p('odd', null, 7)).toBe(200);
    expect(await p('low', null, 18)).toBe(200);
    expect(await p('high', null, 18)).toBe(0);
    expect(await p('dozen2', null, 13)).toBe(300);
    expect(await p('dozen3', null, 24)).toBe(0);
    expect(await p('number', 0, 0)).toBe(3600);
    expect(await p('number', 7, 8)).toBe(0);
  });
});

describe('blackjack', () => {
  it('списывает ставку, не допускает две активные партии, double доплачивает и закрывает партию', async () => {
    const u = await makeUser(db);
    const s = await seedFor(u.id);
    const st = { deck: [1, 2, 3], pos: 0 };
    const start: any = await rpc(db, 'bj_start', u.id, 100, JSON.stringify(st), 'active', null, 0, s.seed_id, s.nonce, key());
    expect(Number(start.balance)).toBe(4900);
    await expectError(rpc(db, 'bj_start', u.id, 100, JSON.stringify(st), 'active', null, 0, s.seed_id, s.nonce, key()), 'game_in_progress');
    await expectError(rpc(db, 'fair_rotate', u.id, 'new', sha('new'), null), 'game_in_progress');
    await expectError(rpc(db, 'bj_apply', u.id, start.game_id, 5, JSON.stringify(st), 'active', null, 0, 0), 'stale_game');
    const fin: any = await rpc(db, 'bj_apply', u.id, start.game_id, 0, JSON.stringify(st), 'finished', 'win', 400, 100);
    expect(Number(fin.balance)).toBe(4900 - 100 + 400);
    const g = await one<any>(db, 'select * from public.blackjack_games where id = $1', [start.game_id]);
    expect(g.status).toBe('finished');
    expect(Number(g.bet)).toBe(200);
    await expectError(rpc(db, 'bj_apply', u.id, start.game_id, 1, JSON.stringify(st), 'finished', 'win', 400, 0), 'stale_game');
  });

  it('игнорирует повтор bj_start с тем же ключом', async () => {
    const u = await makeUser(db);
    const s = await seedFor(u.id);
    const k = key();
    const a: any = await rpc(db, 'bj_start', u.id, 50, '{}', 'finished', 'push', 50, s.seed_id, s.nonce, k);
    const b: any = await rpc(db, 'bj_start', u.id, 50, '{}', 'finished', 'push', 50, s.seed_id, s.nonce, k);
    expect(b.game_id).toBe(a.game_id);
    expect(await balanceOf(db, u.id)).toBe(5000);
  });
});

describe('provably fair', () => {
  it('nonce растёт, ротация раскрывает старый seed (хэш совпадает) и создаёт новый', async () => {
    const u = await makeUser(db);
    const s1 = await seedFor(u.id);
    const s2: any = await rpc(db, 'fair_take_nonce', u.id);
    expect(Number(s2.nonce)).toBe(Number(s1.nonce) + 1);
    const rot: any = await rpc(db, 'fair_rotate', u.id, 'fresh-seed', sha('fresh-seed'), null);
    expect(sha(rot.revealed.server_seed)).toBe(rot.revealed.server_seed_hash);
    expect(Number(rot.revealed.last_nonce)).toBe(2);
    expect(rot.active.server_seed_hash).toBe(sha('fresh-seed'));
    const active = await db.query('select * from public.rng_seeds where user_id = $1 and active', [u.id]);
    expect(active.rows.length).toBe(1);
  });
});

describe('RLS и права', () => {
  it('anon не видит пользователей, транзакции, инвентарь, seed и секреты рулетки, но видит публичный раунд', async () => {
    const u = await makeUser(db);
    await seedFor(u.id);
    await rpc(db, 'roulette_open_round', 'zz', sha('zz'), 30);
    await db.exec('set role anon');
    try {
      for (const t of ['users', 'transactions', 'user_items', 'rng_seeds', 'roulette_round_secrets', 'blackjack_games', 'audit_log', 'settings', 'idempotency_keys', 'support_messages']) {
        await expect(db.query(`select * from public.${t}`), t).rejects.toThrow(/permission denied/);
      }
      const rounds = await db.query('select * from public.roulette_rounds');
      expect(rounds.rows.length).toBeGreaterThan(0);
      await expect(db.query(`insert into public.game_events (kind, display_name, title) values ('case','x','x')`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`update public.users set balance = 999999`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });

  it('клиентские роли не могут вызывать RPC-функции', async () => {
    const u = await makeUser(db);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.query('select public.claim_topup($1)', [u.id])).rejects.toThrow(/permission denied/);
        await expect(db.query('select public.admin_adjust_balance($1, 1, $1, 1000, $2)', [u.id, 'x'])).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec('reset role');
      }
    }
  });

  it('пользователь видит только свои обращения в поддержку', async () => {
    const a = await makeUser(db);
    const b = await makeUser(db);
    await db.query(`insert into public.support_threads (user_id, subject) values ($1, 'A'), ($2, 'B')`, [a.id, b.id]);
    await db.exec('set role authenticated');
    try {
      await db.exec(`select set_config('request.jwt.claims', '{"sub":"${a.id}"}', false)`);
      const r = await db.query<any>('select subject from public.support_threads');
      expect(r.rows.map((x) => x.subject)).toEqual(['A']);
    } finally {
      await db.exec('reset role');
    }
  });

  it('админ-токен (app_role=admin) видит все обращения, обычный пользователь — только свои', async () => {
    const a = await makeUser(db);
    const b = await makeUser(db);
    await db.query(`insert into public.support_threads (user_id, subject) values ($1, 'AdmA'), ($2, 'AdmB')`, [a.id, b.id]);
    await db.exec('set role authenticated');
    try {
      await db.exec(`select set_config('request.jwt.claims', '{"sub":"${a.id}","app_role":"user"}', false)`);
      const own = await db.query<any>(`select subject from public.support_threads where subject like 'Adm%'`);
      expect(own.rows.map((x) => x.subject)).toEqual(['AdmA']);
      await db.exec(`select set_config('request.jwt.claims', '{"sub":"${a.id}","app_role":"admin"}', false)`);
      const all = await db.query<any>(`select subject from public.support_threads where subject like 'Adm%' order by subject`);
      expect(all.rows.map((x) => x.subject)).toEqual(['AdmA', 'AdmB']);
    } finally {
      await db.exec('reset role');
    }
  });

  it('статистика и админ-статистика возвращаются', async () => {
    const u = await makeUser(db);
    const st: any = await rpc(db, 'user_stats', u.id);
    expect(st.cases_opened).toBe(0);
    const ad: any = await rpc(db, 'admin_stats');
    expect(ad.users_total).toBeGreaterThan(0);
  });
});

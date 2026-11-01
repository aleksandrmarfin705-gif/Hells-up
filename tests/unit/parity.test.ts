import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, one, type Db } from '../db/helpers';
import { roulettePayout, BET_TYPES, type BetType } from '@/lib/game/roulette';
import { upgradeChanceBp } from '@/lib/game/upgrade';

let db: Db;
beforeAll(async () => {
  db = await createDb(false);
});

// TS-реализации обязаны совпадать с SQL: сервер считает на TS (UI/превью), а деньги двигает SQL.
describe('соответствие TS ↔ SQL', () => {
  it('roulette_payout: все типы ставок × все числа', async () => {
    for (const type of BET_TYPES) {
      for (let result = 0; result <= 36; result++) {
        const values = type === 'number' ? [0, 7, 36, result] : [null];
        for (const v of values) {
          const sql = Number((await one<any>(db, 'select public.roulette_payout($1,$2,100,$3) p', [type, v, result])).p);
          expect(roulettePayout(type as BetType, v, 100, result), `${type}/${v}/${result}`).toBe(sql);
        }
      }
    }
  });

  it('upgrade_chance_bp совпадает с TS-расчётом', async () => {
    const pairs = [[100, 200], [100, 101], [1, 1000], [60, 150], [5000, 6000], [10, 5000], [250000, 260000], [3, 7]];
    for (const [i, t] of pairs) {
      const sql = (await one<any>(db, 'select public.upgrade_chance_bp($1,$2) c', [i, t])).c;
      expect(upgradeChanceBp(i, t), `${i}->${t}`).toBe(sql);
    }
  });
});

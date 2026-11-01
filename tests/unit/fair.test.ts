import { describe, it, expect } from 'vitest';
import { rollFloat, pickWeighted, shuffledDeck, rouletteResult, sha256Hex, generateServerSeed } from '@/lib/fair';
import { rollWeb, sha256Web } from '@/lib/fair-web';

describe('provably fair', () => {
  it('детерминирован и лежит в [0,1)', () => {
    const a = rollFloat('seed', 'client', 1);
    expect(a).toBe(rollFloat('seed', 'client', 1));
    expect(rollFloat('seed', 'client', 2)).not.toBe(a);
    for (let n = 0; n < 500; n++) {
      const r = rollFloat('s', 'c', n);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it('браузерная реализация (Web Crypto) совпадает с серверной', async () => {
    for (const [s, c, n, k] of [['a', 'b', 1, 0], ['deadbeef', 'x-y', 99, 5], [generateServerSeed(), 'cs', 12345, 3]] as const) {
      expect(await rollWeb(s, c, n, k)).toBe(rollFloat(s, c, n, k));
    }
    expect(await sha256Web('hello')).toBe(sha256Hex('hello'));
  });

  it('распределение близко к равномерному', () => {
    const buckets = new Array(10).fill(0);
    for (let n = 0; n < 20000; n++) buckets[Math.floor(rollFloat('uniform-seed', 'c', n) * 10)]++;
    for (const b of buckets) expect(Math.abs(b - 2000)).toBeLessThan(200);
  });

  it('pickWeighted уважает веса', () => {
    const odds = [{ item_id: 'a', weight: 90 }, { item_id: 'b', weight: 10 }];
    expect(pickWeighted(odds, 0)).toBe('a');
    expect(pickWeighted(odds, 0.899)).toBe('a');
    expect(pickWeighted(odds, 0.9)).toBe('b');
    let a = 0;
    for (let n = 0; n < 10000; n++) if (pickWeighted(odds, rollFloat('w', 'c', n)) === 'a') a++;
    expect(a / 10000).toBeGreaterThan(0.87);
    expect(a / 10000).toBeLessThan(0.93);
  });

  it('колода — перестановка 52 карт, воспроизводимая по seed', () => {
    const d = shuffledDeck('s', 'c', 1);
    expect([...d].sort((x, y) => x - y)).toEqual(Array.from({ length: 52 }, (_, i) => i));
    expect(shuffledDeck('s', 'c', 1)).toEqual(d);
    expect(shuffledDeck('s', 'c', 2)).not.toEqual(d);
  });

  it('результат рулетки в диапазоне 0..36 и воспроизводим', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const r = rouletteResult(`seed-${i}`, 'round');
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(36);
      seen.add(r);
    }
    expect(seen.size).toBe(37);
    expect(rouletteResult('x', 'r')).toBe(rouletteResult('x', 'r'));
  });
});

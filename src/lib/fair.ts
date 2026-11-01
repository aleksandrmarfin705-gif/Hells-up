import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Provably fair (сервер).
 *
 *   roll(serverSeed, clientSeed, nonce, cursor) =
 *     HMAC_SHA256(key = serverSeed, msg = `${clientSeed}:${nonce}:${cursor}`)
 *     → первые 13 hex-символов (52 бита) / 2^52  ∈ [0, 1)
 *
 * До раскрытия публикуется только sha256(serverSeed). После ротации seed раскрывается,
 * и любой может пересчитать все ранее выпавшие результаты (см. /fair и src/lib/fair-web.ts).
 */
export const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');
export const generateServerSeed = () => randomBytes(32).toString('hex');
export const generateClientSeed = () => randomBytes(8).toString('hex');

export function rollFloat(serverSeed: string, clientSeed: string, nonce: number | string, cursor = 0): number {
  const h = createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:${cursor}`).digest('hex');
  return parseInt(h.slice(0, 13), 16) / 2 ** 52;
}

export type Odds = { item_id: string; weight: number };

/** Тот же алгоритм, что в SQL-функции open_case (порядок: weight desc, item_id asc). */
export function pickWeighted(odds: Odds[], roll: number): string {
  const sorted = [...odds].sort((a, b) => b.weight - a.weight || (a.item_id < b.item_id ? -1 : 1));
  const total = sorted.reduce((s, o) => s + o.weight, 0);
  const target = Math.floor(roll * total);
  let acc = 0;
  for (const o of sorted) {
    acc += o.weight;
    if (target < acc) return o.item_id;
  }
  return sorted[sorted.length - 1].item_id;
}

/** Результат общей рулетки: число 0..36. clientSeed = id раунда. */
export function rouletteResult(serverSeed: string, roundId: string): number {
  return Math.floor(rollFloat(serverSeed, roundId, 0, 0) * 37);
}

/** Fisher–Yates с детерминированным потоком roll'ов (cursor растёт на каждом шаге). */
export function shuffledDeck(serverSeed: string, clientSeed: string, nonce: number | string): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1, c = 0; i > 0; i--, c++) {
    const j = Math.floor(rollFloat(serverSeed, clientSeed, nonce, c) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

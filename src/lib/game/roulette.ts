export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

export type BetType = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | 'number';
export const BET_TYPES: BetType[] = ['red', 'black', 'even', 'odd', 'low', 'high', 'dozen1', 'dozen2', 'dozen3', 'number'];

export const colorOf = (n: number): 'red' | 'black' | 'green' => (n === 0 ? 'green' : RED_NUMBERS.includes(n) ? 'red' : 'black');

export const BET_LABELS: Record<BetType, string> = {
  red: 'Красное', black: 'Чёрное', even: 'Чётное', odd: 'Нечётное', low: '1–18', high: '19–36',
  dozen1: '1–12', dozen2: '13–24', dozen3: '25–36', number: 'Число',
};

export const BET_MULTIPLIER: Record<BetType, number> = {
  red: 2, black: 2, even: 2, odd: 2, low: 2, high: 2, dozen1: 3, dozen2: 3, dozen3: 3, number: 36,
};

/** Зеркалит SQL roulette_payout (возвращает выплату вместе со ставкой). */
export function roulettePayout(type: BetType, value: number | null, amount: number, result: number): number {
  if (type === 'number') return result === value ? amount * 36 : 0;
  if (result === 0) return 0;
  const win =
    (type === 'red' && colorOf(result) === 'red') ||
    (type === 'black' && colorOf(result) === 'black') ||
    (type === 'even' && result % 2 === 0) ||
    (type === 'odd' && result % 2 === 1) ||
    (type === 'low' && result <= 18) ||
    (type === 'high' && result >= 19) ||
    (type === 'dozen1' && result <= 12) ||
    (type === 'dozen2' && result >= 13 && result <= 24) ||
    (type === 'dozen3' && result >= 25);
  return win ? amount * BET_MULTIPLIER[type] : 0;
}

/** Движок Blackjack. Работает только на сервере; клиент получает отфильтрованное представление. */
export type BjState = {
  deck: number[];
  pos: number;
  player: number[];
  dealer: number[];
  doubled: boolean;
};
export type BjOutcome = 'win' | 'lose' | 'push' | 'blackjack';
export type BjAction = 'hit' | 'stand' | 'double';

export const rankOf = (c: number) => c % 13; // 0=A, 1..9 → 2..10, 10=J, 11=Q, 12=K
export const suitOf = (c: number) => Math.floor(c / 13); // 0♠ 1♥ 2♦ 3♣

export function cardValue(c: number): number {
  const r = rankOf(c);
  if (r === 0) return 11;
  return r >= 9 ? 10 : r + 1;
}

export function handValue(cards: number[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (rankOf(c) === 0) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards: number[]) => cards.length === 2 && handValue(cards).total === 21;

function draw(s: BjState): number {
  if (s.pos >= s.deck.length) throw new Error('deck_exhausted');
  return s.deck[s.pos++];
}

/** Раздача: игрок, дилер, игрок, дилер. Возвращает состояние и итог, если он уже ясен (натуральный блэкджек). */
export function deal(deck: number[]): { state: BjState; finished: boolean; outcome: BjOutcome | null } {
  const state: BjState = { deck, pos: 0, player: [], dealer: [], doubled: false };
  state.player.push(draw(state));
  state.dealer.push(draw(state));
  state.player.push(draw(state));
  state.dealer.push(draw(state));
  const pBJ = isBlackjack(state.player);
  const dBJ = isBlackjack(state.dealer);
  if (pBJ || dBJ) return { state, finished: true, outcome: pBJ && dBJ ? 'push' : pBJ ? 'blackjack' : 'lose' };
  return { state, finished: false, outcome: null };
}

/** Дилер добирает до 17 (на мягких 17 останавливается). */
function dealerPlay(s: BjState) {
  while (handValue(s.dealer).total < 17) s.dealer.push(draw(s));
}

function settle(s: BjState): BjOutcome {
  const p = handValue(s.player).total;
  if (p > 21) return 'lose';
  dealerPlay(s);
  const d = handValue(s.dealer).total;
  if (d > 21 || p > d) return 'win';
  return p === d ? 'push' : 'lose';
}

/** Выплата вместе со ставкой: win ×2, blackjack ×2.5 (3:2), push ×1. */
export function payoutFor(bet: number, outcome: BjOutcome): number {
  switch (outcome) {
    case 'win': return bet * 2;
    case 'blackjack': return bet + Math.floor((bet * 3) / 2);
    case 'push': return bet;
    default: return 0;
  }
}

export type ActionResult = { state: BjState; finished: boolean; outcome: BjOutcome | null; extraBet: boolean };

export class BjRuleError extends Error {}

export function applyAction(input: BjState, action: BjAction): ActionResult {
  const s: BjState = structuredClone(input);
  if (action === 'hit') {
    s.player.push(draw(s));
    const t = handValue(s.player).total;
    if (t > 21) return { state: s, finished: true, outcome: 'lose', extraBet: false };
    if (t === 21) return { state: s, finished: true, outcome: settle(s), extraBet: false };
    return { state: s, finished: false, outcome: null, extraBet: false };
  }
  if (action === 'stand') {
    return { state: s, finished: true, outcome: settle(s), extraBet: false };
  }
  if (s.player.length !== 2 || s.doubled) throw new BjRuleError('double_not_allowed');
  s.doubled = true;
  s.player.push(draw(s));
  return { state: s, finished: true, outcome: settle(s), extraBet: true };
}

export type BjPublicView = {
  player: number[];
  dealer: number[]; // пока партия активна — только открытая карта
  dealerHidden: boolean;
  playerTotal: number;
  dealerTotal: number | null;
  canDouble: boolean;
};

export function publicView(s: BjState, finished: boolean): BjPublicView {
  return {
    player: s.player,
    dealer: finished ? s.dealer : s.dealer.slice(0, 1),
    dealerHidden: !finished,
    playerTotal: handValue(s.player).total,
    dealerTotal: finished ? handValue(s.dealer).total : cardValue(s.dealer[0]),
    canDouble: !finished && s.player.length === 2 && !s.doubled,
  };
}

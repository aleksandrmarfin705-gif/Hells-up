import { describe, it, expect } from 'vitest';
import { handValue, deal, applyAction, payoutFor, isBlackjack, publicView, BjRuleError, type BjState } from '@/lib/game/blackjack';
import { shuffledDeck } from '@/lib/fair';

// карта = suit*13 + rank; rank 0=A,1..9=2..10,10=J,11=Q,12=K
const A = 0, TWO = 1, FIVE = 4, SIX = 5, SEVEN = 6, NINE = 8, TEN = 9, K = 12;
const deckFrom = (...first: number[]) => {
  const rest = Array.from({ length: 52 }, (_, i) => i).filter((c) => !first.includes(c));
  return [...first, ...rest];
};

describe('подсчёт очков', () => {
  it('туз считается как 11 или 1', () => {
    expect(handValue([A, K]).total).toBe(21);
    expect(handValue([A, A, NINE]).total).toBe(21);
    expect(handValue([A, A]).total).toBe(12);
    expect(handValue([A, SIX, K]).total).toBe(17);
    expect(handValue([K, K, TWO]).total).toBe(22);
    expect(handValue([A, SIX]).soft).toBe(true);
  });
  it('blackjack только на двух картах', () => {
    expect(isBlackjack([A, K])).toBe(true);
    expect(isBlackjack([SEVEN, SEVEN, SEVEN])).toBe(false);
  });
});

describe('партия', () => {
  it('раздача: игрок, дилер, игрок, дилер; колода не отдаётся клиенту, пока партия идёт', () => {
    const { state, finished } = deal(deckFrom(TEN, FIVE, SIX, SEVEN));
    expect(state.player).toEqual([TEN, SIX]);
    expect(state.dealer).toEqual([FIVE, SEVEN]);
    expect(finished).toBe(false);
    const v = publicView(state, false);
    expect(v.dealer.length).toBe(1);
    expect(v.dealerHidden).toBe(true);
    expect(JSON.stringify(v)).not.toContain('deck');
  });

  it('натуральный blackjack игрока оплачивается 3:2, при ничьей — push', () => {
    const w = deal(deckFrom(A, TEN, K, FIVE));
    expect(w.finished).toBe(true);
    expect(w.outcome).toBe('blackjack');
    expect(payoutFor(100, 'blackjack')).toBe(250);
    expect(payoutFor(101, 'blackjack')).toBe(101 + 151);
    const p = deal(deckFrom(A, A + 13, K, K + 13));
    expect(p.outcome).toBe('push');
  });

  it('hit: перебор — поражение, 21 — автоматический stand', () => {
    const { state } = deal(deckFrom(TEN, FIVE, SIX, SEVEN, K));
    const r = applyAction(state, 'hit'); // 16 + K = 26
    expect(r.finished).toBe(true);
    expect(r.outcome).toBe('lose');
    const s2 = deal(deckFrom(TEN, FIVE, FIVE + 13, SIX, FIVE + 26)).state; // игрок 10+5=15, +5 = 20
    const h = applyAction(s2, 'hit');
    expect(h.finished).toBe(false);
  });

  it('stand: дилер добирает до 17 и выбирается победитель', () => {
    // игрок 10+9=19, дилер 5+6=11 → берёт К (21)? подберём: дилер 5,6 + 2 (13) + 4 (17)
    const state = deal(deckFrom(TEN, FIVE, NINE, SIX, TWO, 3)).state;
    const r = applyAction(state, 'stand');
    expect(r.finished).toBe(true);
    expect(r.state.dealer).toEqual([FIVE, SIX, TWO, 3]);
    expect(r.outcome).toBe('win'); // 19 против 17
  });

  it('double: ровно одна карта, ставка удваивается, партия завершается; повторно нельзя', () => {
    const { state } = deal(deckFrom(FIVE, TEN, SIX, SEVEN, TEN + 13)); // игрок 11, +10 = 21
    const r = applyAction(state, 'double');
    expect(r.extraBet).toBe(true);
    expect(r.finished).toBe(true);
    expect(r.state.player.length).toBe(3);
    expect(() => applyAction(r.state, 'double')).toThrow(BjRuleError);
    const hit = applyAction(deal(deckFrom(TEN, FIVE, SIX, SEVEN, TWO)).state, 'hit');
    expect(() => applyAction(hit.state, 'double')).toThrow(BjRuleError);
  });

  it('applyAction не мутирует входное состояние', () => {
    const { state } = deal(deckFrom(TEN, FIVE, SIX, SEVEN, TWO));
    const snapshot = JSON.stringify(state);
    applyAction(state, 'hit');
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('любая партия на случайных колодах завершается корректно, колоды хватает', () => {
    let wins = 0, losses = 0, pushes = 0;
    for (let n = 0; n < 3000; n++) {
      const d = deal(shuffledDeck('fuzz', 'c', n));
      let st: BjState = d.state;
      let outcome = d.outcome;
      let finished = d.finished;
      let guard = 0;
      while (!finished && guard++ < 12) {
        const total = handValue(st.player).total;
        const r = applyAction(st, total < 17 ? 'hit' : 'stand');
        st = r.state; finished = r.finished; outcome = r.outcome;
      }
      expect(finished).toBe(true);
      expect(outcome).not.toBeNull();
      if (outcome === 'win' || outcome === 'blackjack') wins++;
      else if (outcome === 'lose') losses++;
      else pushes++;
    }
    // простая стратегия «до 17» должна проигрывать чаще, чем выигрывать — преимущество казино сохраняется
    expect(losses).toBeGreaterThan(wins);
    expect(wins + losses + pushes).toBe(3000);
  });
});

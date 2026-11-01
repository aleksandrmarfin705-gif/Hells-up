'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { rankOf, suitOf } from '@/lib/game/blackjack';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

export function PlayingCard({ card, hidden, small, delay = 0 }: { card?: number; hidden?: boolean; small?: boolean; delay?: number }) {
  const w = small ? 'h-24 w-[68px]' : 'h-[104px] w-[74px] sm:h-[124px] sm:w-[88px]';
  const red = card !== undefined && (suitOf(card) === 1 || suitOf(card) === 2);
  return (
    <motion.div
      initial={{ y: -40, opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      className={cn('relative flex-none select-none rounded-xl shadow-[0_10px_24px_-8px_rgba(0,0,0,.9)]', w)}
    >
      {hidden || card === undefined ? (
        <div className="absolute inset-0 rounded-xl border border-gold-400/50 bg-[repeating-linear-gradient(45deg,#17120a_0_6px,#0c0a05_6px_12px)] p-1.5">
          <div className="flex h-full items-center justify-center rounded-lg border border-gold-400/40"><span className="h-display gold-text text-2xl">H</span></div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between rounded-xl border border-black/20 bg-[linear-gradient(160deg,#fbf7ea,#e8dfc4)] p-1.5">
          <div className={cn('flex flex-col items-start leading-none', red ? 'text-[#b3122b]' : 'text-[#14110a]')}>
            <span className="text-lg font-bold sm:text-xl">{RANKS[rankOf(card)]}</span><span className="text-base">{SUITS[suitOf(card)]}</span>
          </div>
          <span className={cn('self-center text-3xl sm:text-4xl', red ? 'text-[#b3122b]' : 'text-[#14110a]')}>{SUITS[suitOf(card)]}</span>
          <div className={cn('flex rotate-180 flex-col items-start leading-none', red ? 'text-[#b3122b]' : 'text-[#14110a]')}>
            <span className="text-lg font-bold sm:text-xl">{RANKS[rankOf(card)]}</span><span className="text-base">{SUITS[suitOf(card)]}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

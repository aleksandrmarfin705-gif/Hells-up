'use client';
import { rarityOf } from '@/lib/rarity';
import { timeAgo } from '@/lib/format';
import { Money } from '@/components/ui/ui';
import { IconCases, IconCards, IconDice, IconUpgrade } from '@/components/brand/Icons';
import type { GameEvent } from '@/lib/types';

const ICONS = { case: IconCases, upgrade: IconUpgrade, roulette: IconDice, blackjack: IconCards } as const;

export function EventFeed({ events }: { events: GameEvent[] }) {
  if (!events.length) return <p className="panel px-5 py-8 text-center text-sm text-white/45">Событий пока нет — станьте первым.</p>;
  return (
    <ul className="panel divide-y divide-white/5 overflow-hidden">
      {events.map((e) => {
        const Icon = ICONS[e.kind];
        const color = e.rarity ? rarityOf(e.rarity).color : '#c6f432';
        return (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border" style={{ color, borderColor: color + '44', background: color + '12' }}><Icon size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{e.title}</p>
              <p className="text-xs text-white/40">
                {e.display_name} · {timeAgo(e.created_at)}
                {e.is_demo && <span className="ml-2 rounded border border-white/15 px-1 py-px text-[9px] uppercase tracking-wider text-white/40">демо</span>}
              </p>
            </div>
            {e.amount != null && <Money value={Number(e.amount)} className="text-sm text-lime-200" size={13} />}
          </li>
        );
      })}
    </ul>
  );
}

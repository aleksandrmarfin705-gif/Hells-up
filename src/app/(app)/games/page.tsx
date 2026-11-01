'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageTitle } from '@/components/ui/ui';
import { IconCards, IconDice } from '@/components/brand/Icons';
import { useMe } from '@/lib/client/hooks';
import { RouletteWheel } from '@/components/game/RouletteWheel';
import { PlayingCard } from '@/components/game/PlayingCard';

export default function GamesPage() {
  const { data: me } = useMe();
  const games = [
    { href: '/games/roulette', title: 'Рулетка', text: 'Общий стол: один раунд на всех игроков, ставки в реальном времени.', enabled: me?.settings.roulette_enabled !== false, Icon: IconDice, art: <div className="scale-[0.62] origin-top-right"><RouletteWheel angle={0} size={260} /></div> },
    { href: '/games/blackjack', title: 'Blackjack', text: 'Набери 21 и обыграй дилера. Hit, Stand и Double. Блэкджек платит 3:2.', enabled: me?.settings.blackjack_enabled !== false, Icon: IconCards, art: <div className="flex -space-x-8 rotate-6"><PlayingCard card={0} small /><PlayingCard card={12 + 13} small /></div> },
  ];
  return (
    <>
      <PageTitle eyebrow="Демо-режимы" title="Игры" />
      <div className="grid gap-4 md:grid-cols-2">
        {games.map(({ href, title, text, enabled, Icon, art }, i) => (
          <motion.div key={href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Link href={enabled ? href : '#'} aria-disabled={!enabled}
              className={`panel panel-hover noise relative block min-h-[190px] overflow-hidden p-5 ${enabled ? '' : 'pointer-events-none opacity-50'}`}
              style={{ background: 'radial-gradient(80% 90% at 100% 0%, rgba(198,244,50,.16), transparent 60%), linear-gradient(180deg,#141416,#09090a)' }}>
              <span className="text-lime-300"><Icon size={30} /></span>
              <h2 className="h-display mt-3 text-4xl text-white">{title}</h2>
              <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-white/55">{text}</p>
              {!enabled && <p className="mt-3 text-xs text-rarity-mythic">Временно отключено</p>}
              <div className="pointer-events-none absolute -right-6 -top-2 opacity-60">{art}</div>
            </Link>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-white/35">Все ставки — виртуальные демо-монеты. Вывод и обмен на деньги или реальные ценности невозможны. Результаты рассчитывает сервер.</p>
    </>
  );
}

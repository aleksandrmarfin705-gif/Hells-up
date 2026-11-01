'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/client/api';
import { useMe } from '@/lib/client/hooks';
import { useRealtimeTable } from '@/lib/client/realtime';
import { CaseCard, ItemCard } from '@/components/game/Cards';
import { EventFeed } from '@/components/game/EventFeed';
import { Button, ErrorState, Skeleton } from '@/components/ui/ui';
import { IconChevron, IconDice, IconHistory, IconSparkle, IconSupport, IconUpgrade } from '@/components/brand/Icons';
import { displayName } from '@/lib/format';
import type { CaseSummary, GameEvent, Item } from '@/lib/types';

type Home = { popular: CaseSummary[]; newest: CaseSummary[]; rareItems: Item[]; events: GameEvent[] };

const CATEGORIES = [
  { href: '/cases', label: 'Все' },
  { href: '/cases?cat=hits', label: 'Хиты' },
  { href: '/cases?cat=cheap', label: 'Недорогие' },
  { href: '/cases?cat=rich', label: 'Крупные призы' },
];

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="h-display text-[20px] leading-none text-white">{title}</h2>
        {href && <Link href={href} className="flex items-center gap-0.5 text-[13px] text-lime-300/90 hover:text-lime-200">Все <IconChevron size={16} /></Link>}
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const home = useQuery({ queryKey: ['home'], queryFn: () => api<Home>('/api/home'), refetchInterval: 20_000 });
  useRealtimeTable('game_events', () => qc.invalidateQueries({ queryKey: ['home'] }));
  const s = me?.settings;

  return (
    <>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-8"
        style={{ background: 'radial-gradient(90% 120% at 100% 0%, rgba(198,244,50,.16), transparent 55%), linear-gradient(160deg,#181b20,#0f1013)' }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(70% 90% at 100% 0%, black, transparent)', WebkitMaskImage: 'radial-gradient(70% 90% at 100% 0%, black, transparent)' }} />
        <p className="relative text-[13px] text-white/50">{me ? `Привет, ${displayName(me.user)}` : 'Привет'}</p>
        <h1 className="h-display relative mt-1.5 max-w-sm text-[34px] leading-[1.05] text-white md:text-5xl">
          {s?.banner_title ?? 'Поднимись из пепла'}
        </h1>
        <p className="relative mt-2.5 max-w-xs text-[14px] leading-relaxed text-white/55">{s?.banner_subtitle}</p>
        <div className="relative mt-5 flex flex-wrap gap-2.5">
          <Link href="/cases"><Button size="lg">Открыть кейс</Button></Link>
          <Link href="/games"><Button size="lg" variant="dark">Игры</Button></Link>
        </div>
        <p className="relative mt-4 text-[11px] text-white/30">Демо-режим · виртуальные монеты</p>
      </motion.section>

      {/* Быстрые разделы */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { href: '/upgrade', label: 'Upgrade', Icon: IconUpgrade },
          { href: '/games', label: 'Игры', Icon: IconDice },
          { href: '/history', label: 'История', Icon: IconHistory },
          { href: '/support', label: 'Поддержка', Icon: IconSupport },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="panel panel-hover flex flex-col items-center gap-1.5 py-3 text-[11px] font-medium text-white/70">
            <span className="text-lime-400"><Icon size={20} /></span>{label}
          </Link>
        ))}
      </div>

      {/* Категории */}
      <div className="scroll-x mt-6">
        {CATEGORIES.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-full border border-white/10 bg-surface px-4 py-2 text-[13px] font-medium text-white/70 transition hover:border-lime-400/50 hover:text-white">{c.label}</Link>
        ))}
      </div>

      {home.isError ? (
        <div className="mt-8"><ErrorState message="Не удалось загрузить каталог" onRetry={() => home.refetch()} /></div>
      ) : (
        <>
          <Section title="Популярные кейсы" href="/cases?cat=hits">
            {home.isLoading ? <CaseSkeletons /> : (
              <div className="scroll-x md:grid md:grid-cols-4 md:overflow-visible md:[margin-inline:0] md:[padding-inline:0]">
                {home.data?.popular.map((c, i) => <CaseCard key={c.id} c={c} index={i} className="w-[158px] md:w-auto" />)}
              </div>
            )}
          </Section>

          <Section title="Новые кейсы" href="/cases">
            {home.isLoading ? <CaseSkeletons /> : (
              <div className="scroll-x md:grid md:grid-cols-4 md:overflow-visible md:[margin-inline:0] md:[padding-inline:0]">
                {home.data?.newest.map((c, i) => <CaseCard key={c.id} c={c} index={i} className="w-[158px] md:w-auto" />)}
              </div>
            )}
          </Section>

          <Section title="Редкие предметы">
            {home.isLoading ? <div className="scroll-x">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-32" />)}</div> : (
              <div className="scroll-x">
                {home.data?.rareItems.map((it) => <ItemCard key={it.id} item={it} className="w-32" size={72} />)}
              </div>
            )}
          </Section>

          <Section title="Последние выигрыши">
            {home.isLoading ? <Skeleton className="h-56 w-full" /> : <EventFeed events={home.data?.events ?? []} />}
          </Section>
        </>
      )}
      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/25"><IconSparkle size={13} />Результаты считает сервер · provably fair</p>
    </>
  );
}

function CaseSkeletons() {
  return <div className="scroll-x md:grid md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-[158px] md:w-auto" />)}</div>;
}

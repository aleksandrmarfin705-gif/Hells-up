'use client';
import { useEffect, useMemo, useRef } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { ItemArt } from '@/components/game/ItemArt';
import { rarityOf } from '@/lib/rarity';
import { haptic } from '@/lib/client/telegram';
import type { Item } from '@/lib/types';

const W = 116; // ширина карточки + отступ
const WIN_INDEX = 40;

type ReelItem = Pick<Item, 'id' | 'name' | 'rarity' | 'art' | 'image_url'>;

/** Горизонтальная лента с остановкой на предмете, который уже определил сервер. Анимация — только визуальная. */
export function Reel({ pool, winner, onDone }: { pool: (ReelItem & { weight: number })[]; winner: ReelItem; onDone: () => void }) {
  const x = useMotionValue(0);
  const box = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const strip = useMemo(() => {
    const total = pool.reduce((s, p) => s + p.weight, 0) || 1;
    const pick = () => {
      let t = Math.random() * total;
      for (const p of pool) { t -= p.weight; if (t <= 0) return p; }
      return pool[0];
    };
    return Array.from({ length: WIN_INDEX + 8 }, (_, i) => (i === WIN_INDEX ? winner : pick()));
  }, [pool, winner]);

  useEffect(() => {
    const w = box.current?.clientWidth ?? 320;
    const jitter = (Math.random() - 0.5) * (W - 36);
    const target = -(WIN_INDEX * W + W / 2 - w / 2 + jitter);
    let last = 0;
    const unsub = x.on('change', (v) => {
      const idx = Math.floor(-v / W);
      if (idx !== last) { last = idx; if (idx % 2 === 0) haptic.select(); }
    });
    const c = animate(x, target, { duration: 5.6, ease: [0.1, 0.72, 0.12, 1], onComplete: () => { haptic.impact('heavy'); done.current(); } });
    return () => { c.stop(); unsub(); };
  }, [x]);

  return (
    <div ref={box} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 py-4">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-gradient-to-b from-lime-200 via-lime-400 to-lime-200 shadow-[0_0_16px_3px_rgba(198,244,50,.7)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,#050505_0%,transparent_22%,transparent_78%,#050505_100%)]" />
      <motion.div style={{ x }} className="flex">
        {strip.map((it, i) => {
          const r = rarityOf(it.rarity);
          return (
            <div key={i} className="flex-none px-1" style={{ width: W }}>
              <div className="relative rounded-xl border p-2" style={{ borderColor: r.color + '55', background: `linear-gradient(180deg, ${r.color}1f, transparent)` }}>
                <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: r.color }} />
                <ItemArt art={it.art} rarity={it.rarity} imageUrl={it.image_url} size={72} className="mx-auto" glow={false} />
                <p className="mt-1 truncate text-center text-[10px] text-white/60">{it.name}</p>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

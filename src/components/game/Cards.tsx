'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { CaseArt } from '@/components/game/CaseArt';
import { ItemArt } from '@/components/game/ItemArt';
import { Money } from '@/components/ui/ui';
import { rarityOf } from '@/lib/rarity';
import { cn } from '@/lib/cn';
import type { CaseSummary, Item } from '@/lib/types';
import { haptic } from '@/lib/client/telegram';

export function CaseCard({ c, index = 0, className }: { c: CaseSummary; index?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: Math.min(index, 6) * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <Link href={`/cases/${c.id}`} onClick={() => haptic.select()} className="panel panel-hover group relative block overflow-hidden p-4 pb-4">
        <div className="pointer-events-none absolute inset-0 opacity-70 transition group-hover:opacity-100" style={{ background: `radial-gradient(70% 55% at 50% 38%, ${c.accent}26, transparent 70%)` }} />
        {c.is_featured && <span className="absolute left-3 top-3 z-10 rounded-full border border-gold-400/40 bg-gold-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold-200">Хит</span>}
        <div className="relative flex justify-center pt-2 transition duration-500 group-hover:-translate-y-1 group-hover:scale-105">
          <CaseArt art={c.art} accent={c.accent} imageUrl={c.image_url} size={132} />
        </div>
        <div className="relative mt-2 text-center">
          <p className="h-display truncate text-[22px] leading-tight text-white">{c.name}</p>
          <p className="mt-0.5 text-[11px] text-white/40">{c.item_count} предметов</p>
          <div className="mt-3 inline-flex items-center rounded-full border border-gold-400/30 bg-black/50 px-3.5 py-1.5 text-sm text-gold-100">
            <Money value={c.price} size={15} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ItemCard({
  item, selected, onClick, footer, badge, className, size = 84,
}: {
  item: Pick<Item, 'name' | 'rarity' | 'art' | 'image_url' | 'virtual_price'>;
  selected?: boolean; onClick?: () => void; footer?: ReactNode; badge?: ReactNode; className?: string; size?: number;
}) {
  const r = rarityOf(item.rarity);
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn('panel relative overflow-hidden p-3 text-left transition', onClick && 'active:scale-[0.97]', selected ? 'ring-2 ring-gold-400' : '', className)}
      style={{ borderColor: r.color + (selected ? 'aa' : '40') }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(80% 60% at 50% 30%, ${r.color}24, transparent 75%)` }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }} />
      {badge && <div className="absolute right-2 top-2 z-10">{badge}</div>}
      <div className="relative flex justify-center py-1"><ItemArt art={item.art} rarity={item.rarity} imageUrl={item.image_url} size={size} /></div>
      <p className="relative mt-1 truncate text-[13px] font-semibold text-white">{item.name}</p>
      <div className="relative mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: r.color }}>{r.label}</span>
        <Money value={Number(item.virtual_price)} size={12} className="text-[12px] text-gold-200" />
      </div>
      {footer && <div className="relative mt-2">{footer}</div>}
    </Tag>
  );
}

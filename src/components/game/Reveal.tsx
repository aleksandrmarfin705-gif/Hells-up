'use client';
import { motion } from 'framer-motion';
import { ItemArt } from '@/components/game/ItemArt';
import { RarityBadge } from '@/components/game/RarityBadge';
import { Money } from '@/components/ui/ui';
import { rarityOf } from '@/lib/rarity';
import type { Item } from '@/lib/types';

/** Экран «выпал предмет»: лучи, свечение и появление карточки. */
export function Reveal({ item, caption, lost }: { item: Pick<Item, 'name' | 'rarity' | 'art' | 'image_url' | 'virtual_price' | 'description'>; caption?: string; lost?: boolean }) {
  const r = rarityOf(item.rarity);
  return (
    <div className="relative flex flex-col items-center overflow-hidden px-2 pb-1 pt-4 text-center">
      {!lost && (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[110px] h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="h-full w-full rounded-full"
            style={{ background: `conic-gradient(from 0deg, transparent, ${r.color}55, transparent 25%, ${r.color}40, transparent 50%, ${r.color}55, transparent 75%, ${r.color}40, transparent)`, maskImage: 'radial-gradient(circle closest-side, black 15%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle closest-side, black 15%, transparent 100%)' }}
            animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
      {caption && <p className="eyebrow relative">{caption}</p>}
      <motion.div
        className="relative mt-3" initial={{ scale: 0.3, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: lost ? 0.55 : 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
        style={lost ? { filter: 'grayscale(1)' } : undefined}
      >
        <ItemArt art={item.art} rarity={item.rarity} imageUrl={item.image_url} size={150} />
      </motion.div>
      <motion.div className="relative mt-3 space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <p className="h-display text-[32px] leading-none text-white">{item.name}</p>
        <div className="flex items-center justify-center gap-3"><RarityBadge rarity={item.rarity} /><Money value={Number(item.virtual_price)} className="text-lime-200" size={15} /></div>
        {item.description && <p className="mx-auto max-w-xs text-[13px] leading-snug text-white/45">{item.description}</p>}
      </motion.div>
    </div>
  );
}

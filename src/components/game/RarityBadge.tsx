import { rarityOf } from '@/lib/rarity';

export function RarityBadge({ rarity, className = '' }: { rarity: string; className?: string }) {
  const r = rarityOf(rarity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${className}`}
      style={{ color: r.color, borderColor: r.color + '55', background: r.color + '14' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
      {r.label}
    </span>
  );
}

import { useId, type ReactNode } from 'react';
import { rarityOf } from '@/lib/rarity';
import { cn } from '@/lib/cn';

const shapes: Record<string, (fill: string, light: string) => ReactNode> = {
  coin: (f, l) => (<><circle cx="50" cy="50" r="36" fill={f} /><circle cx="50" cy="50" r="27" fill="none" stroke={l} strokeOpacity=".5" strokeWidth="2.5" /><path d="M50 32v36M39 44l11-12 11 12" fill="none" stroke={l} strokeOpacity=".85" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></>),
  blade: (f, l) => (<g transform="rotate(38 50 50)"><path d="M50 4 58 58 50 66 42 58Z" fill={f} /><path d="M50 4v62" stroke={l} strokeOpacity=".55" strokeWidth="2" /><rect x="28" y="64" width="44" height="8" rx="4" fill={f} /><rect x="45.5" y="72" width="9" height="16" rx="3" fill={f} stroke={l} strokeOpacity=".35" /><circle cx="50" cy="92" r="5" fill={f} /></g>),
  skull: (f, l) => (<><path d="M50 12C27 12 19 29 21 46c1 8 6 12 11 14v13h10v-7h4v7h8v-7h4v7h10V60c5-2 10-6 11-14 2-17-6-34-29-34Z" fill={f} /><circle cx="37" cy="44" r="8" fill="#050505" /><circle cx="63" cy="44" r="8" fill="#050505" /><path d="M50 52l-4 8h8Z" fill="#050505" /><path d="M30 24c6-6 14-8 20-8" stroke={l} strokeOpacity=".5" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>),
  ring: (f, l) => (<><circle cx="50" cy="60" r="24" fill="none" stroke={f} strokeWidth="9" /><circle cx="50" cy="60" r="24" fill="none" stroke={l} strokeOpacity=".35" strokeWidth="2" /><path d="M50 8l15 14-15 18-15-18Z" fill={f} stroke={l} strokeOpacity=".7" strokeWidth="2" /><path d="M35 22h30M50 8v32" stroke={l} strokeOpacity=".5" strokeWidth="1.5" /></>),
  potion: (f, l) => (<><rect x="41" y="6" width="18" height="9" rx="3" fill={l} fillOpacity=".7" /><path d="M42 15h16v12l15 29c7 16-2 32-23 32S20 72 27 56l15-29Z" fill={f} /><path d="M33 58c5 3 11 4 17 2s12-2 17 1" stroke={l} strokeOpacity=".6" strokeWidth="2.5" fill="none" strokeLinecap="round" /><circle cx="42" cy="72" r="3" fill={l} fillOpacity=".5" /><circle cx="56" cy="66" r="2" fill={l} fillOpacity=".5" /></>),
  key: (f, l) => (<g transform="rotate(40 50 50)"><circle cx="50" cy="24" r="15" fill="none" stroke={f} strokeWidth="9" /><rect x="46" y="38" width="8" height="52" rx="3" fill={f} /><rect x="54" y="66" width="12" height="7" rx="2" fill={f} /><rect x="54" y="79" width="8" height="7" rx="2" fill={f} /><circle cx="50" cy="24" r="15" fill="none" stroke={l} strokeOpacity=".3" strokeWidth="1.5" /></g>),
  shield: (f, l) => (<><path d="M50 7l33 12v29c0 20-14 35-33 45-19-10-33-25-33-45V19Z" fill={f} /><path d="M50 17l24 9v22c0 14-10 25-24 33-14-8-24-19-24-33V26Z" fill="none" stroke={l} strokeOpacity=".55" strokeWidth="2.5" /><path d="M50 30v38M36 44h28" stroke={l} strokeOpacity=".75" strokeWidth="5" strokeLinecap="round" /></>),
  gem: (f, l) => (<><path d="M28 18h44l19 22-41 52L9 40Z" fill={f} /><path d="M9 40h82M28 18l10 22 12 52M72 18 62 40 50 92M38 40l12-22 12 22" stroke={l} strokeOpacity=".6" strokeWidth="2" fill="none" strokeLinejoin="round" /><path d="M32 24h16l-6 12Z" fill="#fff" fillOpacity=".3" /></>),
  orb: (f, l) => (<><ellipse cx="50" cy="88" rx="26" ry="5" fill={f} fillOpacity=".55" /><circle cx="50" cy="50" r="34" fill={f} /><circle cx="50" cy="50" r="34" fill="none" stroke={l} strokeOpacity=".4" strokeWidth="2" /><ellipse cx="38" cy="34" rx="12" ry="7" fill="#fff" fillOpacity=".3" transform="rotate(-30 38 34)" /><path d="M24 58c14 10 38 10 52-4" stroke={l} strokeOpacity=".45" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>),
  crown: (f, l) => (<><path d="M13 72 19 30l17 20 14-28 14 28 17-20 6 42Z" fill={f} /><rect x="13" y="72" width="74" height="12" rx="4" fill={f} stroke={l} strokeOpacity=".5" strokeWidth="2" /><circle cx="19" cy="27" r="5" fill={l} /><circle cx="50" cy="19" r="5.5" fill={l} /><circle cx="81" cy="27" r="5" fill={l} /><path d="M50 40l7 10-7 12-7-12Z" fill="#050505" fillOpacity=".55" /><path d="M24 78h52" stroke={l} strokeOpacity=".55" strokeWidth="2" /></>),
  flame: (f, l) => (<><path d="M50 6c5 17 25 27 25 52 0 18-12 32-25 32S25 76 25 58c0-12 8-18 12-28 4 8 7 10 11 12-2-12-2-24 2-36Z" fill={f} /><path d="M50 44c3 10 14 15 14 28 0 10-6 17-14 17s-14-7-14-17c0-8 5-12 8-18 2 4 4 6 6 6-1-6-1-11 0-16Z" fill={l} fillOpacity=".75" /></>),
};

export function ItemArt({
  art, rarity, imageUrl, size = 96, className, glow = true,
}: { art: string; rarity: string; imageUrl?: string | null; size?: number; className?: string; glow?: boolean }) {
  const id = useId().replace(/:/g, '');
  const r = rarityOf(rarity);
  if (imageUrl) {
    return <img src={imageUrl} alt="" width={size} height={size} className={cn('object-contain', className)} style={{ width: size, height: size }} loading="lazy" referrerPolicy="no-referrer" />;
  }
  const draw = shapes[art] ?? shapes.gem;
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden
      style={glow ? { filter: `drop-shadow(0 6px 14px ${r.color}66)` } : undefined}
    >
      <defs>
        <linearGradient id={`a${id}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={r.from} />
          <stop offset="1" stopColor={r.to} />
        </linearGradient>
      </defs>
      {draw(`url(#a${id})`, r.from)}
    </svg>
  );
}

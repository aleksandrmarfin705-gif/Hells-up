import { useId } from 'react';
import { cn } from '@/lib/cn';

const ACCENT = '#c6f432'; // единый акцент; индивидуальные цвета кейсов не используются

/** Минималистичный контейнер: графит + лаймовая линия света. Эмблема зависит от `art`. */
export function CaseArt({
  art = 'chest', imageUrl, size = 140, className, open = false,
}: { art?: string; accent?: string; imageUrl?: string | null; size?: number; className?: string; open?: boolean }) {
  const id = useId().replace(/:/g, '');
  if (imageUrl) {
    return <img src={imageUrl} alt="" width={size} height={size} className={cn('object-contain', className)} style={{ width: size, height: size }} loading="lazy" referrerPolicy="no-referrer" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden style={{ filter: 'drop-shadow(0 10px 20px rgba(198,244,50,.12))' }}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2e36" /><stop offset="1" stopColor="#14161a" />
        </linearGradient>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#343944" /><stop offset="1" stopColor="#1d2026" />
        </linearGradient>
        <radialGradient id={`g${id}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={ACCENT} stopOpacity=".35" /><stop offset="1" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="105" rx="40" ry="7" fill={`url(#g${id})`} />
      {/* корпус */}
      <rect x="20" y="50" width="80" height="52" rx="12" fill={`url(#b${id})`} stroke="rgba(255,255,255,.1)" />
      {/* линия света */}
      <rect x="24" y="52" width="72" height={open ? 5 : 2.4} rx="1.4" fill={ACCENT} opacity={open ? 0.95 : 0.85} />
      {/* крышка */}
      <g transform={open ? 'translate(0 -7) rotate(-3 60 48)' : undefined}>
        <rect x="20" y="22" width="80" height="29" rx="11" fill={`url(#l${id})`} stroke="rgba(255,255,255,.12)" />
        <path d="M30 31h26" stroke="#fff" strokeOpacity=".1" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* эмблема */}
      {art === 'flame' && <path d="M60 64c2.2 5 8.5 7.6 8.5 14.2 0 5-3.8 8.6-8.5 8.6s-8.5-3.6-8.5-8.6c0-4 2.4-5.6 4-8.6 1.4 2 2.4 2.8 4 3.4-.6-3.4-.6-6.6.5-9Z" fill={ACCENT} />}
      {art === 'crown' && <path d="M62 62 51 77h8l-2 11 12-16h-8Z" fill={ACCENT} />}
      {art === 'relic' && <path d="M60 62l11 13-11 13-11-13Z" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinejoin="round" />}
      {art === 'chest' && <rect x="52" y="68" width="16" height="16" rx="4" fill="none" stroke={ACCENT} strokeWidth="3" />}
    </svg>
  );
}

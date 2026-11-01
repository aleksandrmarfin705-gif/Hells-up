import { useId } from 'react';
import { cn } from '@/lib/cn';

export function CaseArt({
  art = 'chest', accent = '#d4af37', imageUrl, size = 140, className, open = false,
}: { art?: string; accent?: string; imageUrl?: string | null; size?: number; className?: string; open?: boolean }) {
  const id = useId().replace(/:/g, '');
  if (imageUrl) {
    return <img src={imageUrl} alt="" width={size} height={size} className={cn('object-contain', className)} style={{ width: size, height: size }} loading="lazy" referrerPolicy="no-referrer" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden style={{ filter: `drop-shadow(0 10px 22px ${accent}40)` }}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#222228" /><stop offset="1" stopColor="#0b0b0d" />
        </linearGradient>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d2d34" /><stop offset="1" stopColor="#15151a" />
        </linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} /><stop offset="1" stopColor={accent} stopOpacity=".45" />
        </linearGradient>
        <radialGradient id={`g${id}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={accent} stopOpacity=".55" /><stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="42" ry="8" fill={`url(#g${id})`} />
      {/* свет из щели крышки */}
      <path d="M22 54h76" stroke={accent} strokeWidth={open ? 5 : 2} strokeLinecap="round" opacity={open ? 0.95 : 0.7} />
      {/* корпус */}
      <path d="M18 54h84v42a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6Z" fill={`url(#b${id})`} stroke={`url(#t${id})`} strokeWidth="1.4" />
      {/* крышка */}
      <g transform={open ? 'translate(0 -6) rotate(-4 60 52)' : undefined}>
        <path d="M18 54C18 30 34 20 60 20s42 10 42 34Z" fill={`url(#l${id})`} stroke={`url(#t${id})`} strokeWidth="1.4" />
        <path d="M30 52C32 38 42 30 60 30" stroke="#fff" strokeOpacity=".07" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      {/* металлические полосы */}
      <rect x="50" y="22" width="20" height="80" rx="2" fill={`url(#t${id})`} opacity=".9" />
      <rect x="18" y="66" width="84" height="3" fill={accent} opacity=".35" />
      {/* замок */}
      <rect x="53" y="58" width="14" height="16" rx="3" fill="#0a0a0a" stroke={accent} strokeWidth="1.4" />
      <circle cx="60" cy="65" r="2.4" fill={accent} />
      {/* эмблема */}
      {art === 'flame' && <path d="M60 4c2 7 11 11 11 21 0 7-5 12-11 12s-11-5-11-12c0-5 3-7 5-11 2 3 3 4 5 5-1-5-1-10 1-15Z" fill={accent} opacity=".95" transform="translate(0 -2)" />}
      {art === 'crown' && <path d="M44 28 47 8l7 8 6-12 6 12 7-8 3 20Z" fill={accent} transform="translate(0 -2)" />}
      {art === 'relic' && <path d="M60 3l10 12-10 15-10-15Z" fill={accent} transform="translate(0 -1)" />}
    </svg>
  );
}

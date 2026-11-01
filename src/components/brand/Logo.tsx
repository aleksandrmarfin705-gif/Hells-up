import { useId } from 'react';
import { cn } from '@/lib/cn';

/** Знак: стилизованное пламя, поднимающееся вверх, внутри золотого кольца. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5e3a0" />
          <stop offset=".5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8f6f1f" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="#0a0a0a" stroke={`url(#g${id})`} strokeWidth="1.6" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke="rgba(212,175,55,.25)" strokeWidth=".8" />
      <path d="M24 8c1.6 5.2 7.6 8.2 7.6 15.2 0 2.6-1 4.6-2.4 6 .2-3.2-1.2-5.2-3.4-6.6.4 3.4-1.4 5.2-3.2 6.8-1.8-1.6-3.4-3.4-3.2-6.4C20.6 20 24 15.4 24 8Z" fill={`url(#g${id})`} />
      <path d="M13.5 33.5 24 25l10.5 8.5" fill="none" stroke={`url(#g${id})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 38 24 32.5 30.5 38" fill="none" stroke={`url(#g${id})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
    </svg>
  );
}

export function Logo({ size = 34, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {withText && (
        <span className="h-display gold-text text-[22px] leading-none tracking-[0.18em]" style={{ fontSize: size * 0.62 }}>
          HELLS&nbsp;UP
        </span>
      )}
    </span>
  );
}

import { cn } from '@/lib/cn';

/** Знак: скруглённый квадрат с двойной стрелкой вверх (up). Чистая геометрия, один акцентный цвет. */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#c6f432" />
      <path d="M11 22.5 20 13.5l9 9" fill="none" stroke="#0d1403" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 29.5 20 20.5l9 9" fill="none" stroke="#0d1403" strokeOpacity=".45" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 32, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {withText && (
        <span className="h-display leading-none tracking-tight text-white" style={{ fontSize: size * 0.58, fontWeight: 700 }}>
          HELLS<span className="accent-text"> UP</span>
        </span>
      )}
    </span>
  );
}

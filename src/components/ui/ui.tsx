'use client';
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/cn';
import { Coin } from '@/components/brand/Icons';
import { fmt } from '@/lib/format';
import { haptic } from '@/lib/client/telegram';
import { Modal } from '@/components/ui/Modal';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'gold' | 'dark' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; full?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'gold', size = 'md', loading, full, className, children, disabled, onClick, ...rest }, ref,
) {
  const sizes = { sm: 'h-9 px-3.5 text-[13px]', md: 'h-12 px-5 text-[15px]', lg: 'h-14 px-7 text-base' }[size];
  const variants = {
    gold: 'text-[#1a1304] font-semibold bg-[linear-gradient(135deg,#f5e3a0_0%,#d4af37_50%,#a67c1b_100%)] shadow-[0_8px_28px_-8px_rgba(212,175,55,.6),inset_0_1px_0_rgba(255,255,255,.45)] hover:brightness-110',
    dark: 'text-gold-200 font-medium border border-gold-400/30 bg-surface-2 hover:border-gold-400/60 hover:bg-surface-3',
    ghost: 'text-white/70 hover:text-white hover:bg-white/5',
    danger: 'text-rarity-mythic font-medium border border-rarity-mythic/40 bg-rarity-mythic/10 hover:bg-rarity-mythic/20',
  }[variant];
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onClick={(e) => { haptic.impact('light'); onClick?.(e); }}
      className={cn('relative inline-flex select-none items-center justify-center gap-2 rounded-xl transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45', sizes, variants, full && 'w-full', className)}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
});

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-label="Загрузка">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden />;

export function Money({ value, className, size = 14, signed }: { value: number; className?: string; size?: number; signed?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums', className)}>
      <Coin size={size} />
      {signed && value > 0 ? '+' : ''}{fmt(value)}
    </span>
  );
}

/** Плавно «докручивает» число при изменении. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => fmt(v));
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.7, ease: 'easeOut' });
    return () => c.stop();
  }, [value, mv]);
  useEffect(() => text.on('change', (v) => { if (ref.current) ref.current.textContent = v; }), [text]);
  return <span ref={ref} className={cn('tabular-nums', className)}>{fmt(value)}</span>;
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 text-gold-400/70">{icon}</div>}
      <p className="h-display text-2xl text-white">{title}</p>
      {text && <p className="mt-2 max-w-xs text-sm text-white/50">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-10 text-center">
      <p className="h-display text-2xl text-white">Не удалось загрузить</p>
      <p className="mt-2 max-w-xs text-sm text-white/50">{message ?? 'Проверьте соединение и попробуйте ещё раз.'}</p>
      {onRetry && <Button variant="dark" size="sm" className="mt-5" onClick={onRetry}>Повторить</Button>}
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, className,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cn('flex gap-1 rounded-2xl border border-white/10 bg-surface p-1', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value} role="tab" aria-selected={active}
            onClick={() => { haptic.select(); onChange(o.value); }}
            className={cn('relative flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-medium transition', active ? 'text-[#1a1304]' : 'text-white/55 hover:text-white')}
          >
            {active && <motion.span layoutId={`seg-${options.map((x) => x.value).join('')}`} className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,#f5e3a0,#d4af37_55%,#a67c1b)]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, total, size, onChange }: { page: number; total: number; size: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Button variant="dark" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Назад</Button>
      <span className="text-sm text-white/50">{page} / {pages}</span>
      <Button variant="dark" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Далее</Button>
    </div>
  );
}

export function ConfirmDialog({
  open, onOpenChange, title, text, confirmLabel = 'Подтвердить', danger, loading, onConfirm,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; text?: ReactNode;
  confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      {text && <div className="text-[15px] leading-relaxed text-white/65">{text}</div>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="dark" onClick={() => onOpenChange(false)}>Отмена</Button>
        <Button variant={danger ? 'danger' : 'gold'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function PageTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="h-display text-[34px] leading-none text-white md:text-4xl">{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

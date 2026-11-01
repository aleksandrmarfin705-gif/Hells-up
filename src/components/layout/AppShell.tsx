'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Logo, LogoMark } from '@/components/brand/Logo';
import {
  Coin, IconCases, IconGames, IconHistory, IconHome, IconInventory, IconPlus, IconProfile,
  IconShield, IconSparkle, IconSupport, IconUpgrade,
} from '@/components/brand/Icons';
import { AnimatedNumber } from '@/components/ui/ui';
import { useMe } from '@/lib/client/hooks';
import { haptic, tg } from '@/lib/client/telegram';
import { cn } from '@/lib/cn';

const MAIN = [
  { href: '/', label: 'Главная', Icon: IconHome },
  { href: '/cases', label: 'Кейсы', Icon: IconCases },
  { href: '/inventory', label: 'Предметы', Icon: IconInventory },
  { href: '/profile', label: 'Профиль', Icon: IconProfile },
];
const MORE = [
  { href: '/upgrade', label: 'Upgrade', Icon: IconUpgrade },
  { href: '/games', label: 'Игры', Icon: IconGames },
  { href: '/history', label: 'История', Icon: IconHistory },
  { href: '/support', label: 'Поддержка', Icon: IconSupport },
  { href: '/fair', label: 'Честность', Icon: IconSparkle },
];

const active = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data: me } = useMe();

  // Нативная кнопка «Назад» Telegram на вложенных страницах
  useEffect(() => {
    const bb = tg()?.BackButton;
    if (!bb) return;
    const isRoot = MAIN.some((m) => m.href === path);
    const back = () => router.back();
    if (isRoot) bb.hide();
    else { bb.show(); bb.onClick(back); }
    return () => bb.offClick?.(back);
  }, [path, router]);

  const nav = me?.isAdmin ? [...MORE, { href: '/admin', label: 'Админка', Icon: IconShield }] : MORE;

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-[#0e0f12] px-4 py-6 md:flex">
        <Link href="/" className="px-2"><Logo size={38} /></Link>
        <nav className="mt-10 space-y-1">
          {[...MAIN, ...nav].map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', active(path, href) ? 'bg-white/[0.06] text-white shadow-[inset_2px_0_0_#c6f432]' : 'text-white/55 hover:bg-white/5 hover:text-white')}>
              <Icon size={20} />{label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-2 text-[11px] leading-relaxed text-white/30">Демо-версия. Только виртуальные монеты — вывод и обмен на реальные ценности невозможны.</p>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-ink/85 backdrop-blur-xl" style={{ paddingTop: 'calc(var(--safe-top) + var(--content-top))' }}>
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
            <Link href="/" className="md:hidden"><Logo size={30} /></Link>
            <div className="hidden md:block" />
            <div className="flex items-center gap-2">
              <Link href="/profile" className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-surface-2 pl-3 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                <Coin size={18} />
                <span className="text-[15px] font-semibold text-white"><AnimatedNumber value={me?.user.balance ?? 0} /></span>
              </Link>
              <Link
                href="/topup" aria-label="Пополнить баланс" onClick={() => haptic.select()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 text-[#0d1403] shadow-[0_6px_18px_-6px_rgba(198,244,50,.6)] transition active:scale-90"
              >
                <IconPlus size={20} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pt-5 md:pb-14" style={{ paddingBottom: 'calc(var(--safe-bottom) + 6.5rem)' }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden" aria-label="Основная навигация">
        <div className="mx-auto max-w-lg px-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 0.5rem)' }}>
          <div className="flex items-stretch justify-between rounded-[1.6rem] border border-white/10 bg-[#0a0a0b]/90 p-1.5 shadow-[0_-8px_40px_-10px_rgba(0,0,0,.9),0_0_0_1px_rgba(0,0,0,.6)] backdrop-blur-xl">
            {MAIN.map(({ href, label, Icon }) => {
              const on = active(path, href);
              return (
                <Link key={href} href={href} onClick={() => haptic.select()} className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium" aria-current={on ? 'page' : undefined}>
                  {on && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-2xl bg-white/[0.07]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={cn('relative transition', on ? 'text-lime-400' : 'text-white/45')}><Icon size={22} /></span>
                  <span className={cn('relative transition', on ? 'text-white' : 'text-white/40')}>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

export { LogoMark };

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/lib/client/hooks';
import { EmptyState } from '@/components/ui/ui';
import { IconShield } from '@/components/brand/Icons';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/admin', label: 'Dashboard' }, { href: '/admin/users', label: 'Пользователи' }, { href: '/admin/cases', label: 'Кейсы' },
  { href: '/admin/items', label: 'Предметы' }, { href: '/admin/games', label: 'Игры' }, { href: '/admin/support', label: 'Поддержка' },
  { href: '/admin/settings', label: 'Настройки' }, { href: '/admin/audit', label: 'Аудит' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const path = usePathname();
  if (!me) return null;
  // Серверная проверка выполняется на каждом /api/admin/* запросе; это лишь UI-защита.
  if (!me.isAdmin) return <EmptyState icon={<IconShield size={44} />} title="Нет доступа" text="Админ-панель доступна только администраторам." />;
  return (
    <>
      <div className="mb-1 flex items-center gap-2 text-gold-300"><IconShield size={18} /><span className="eyebrow">Админ-панель</span></div>
      <div className="scroll-x mb-5">
        {TABS.map((t) => {
          const on = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href);
          return <Link key={t.href} href={t.href} className={cn('rounded-full border px-4 py-2 text-[13px] font-medium transition', on ? 'border-gold-400 bg-gold-400/15 text-gold-100' : 'border-white/10 text-white/50 hover:text-white')}>{t.label}</Link>;
        })}
      </div>
      {children}
    </>
  );
}

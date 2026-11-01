'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { ErrorState, PageTitle, Skeleton, Stat } from '@/components/ui/ui';
import { fmt } from '@/lib/format';

export default function AdminDashboard() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => api<{ stats: Record<string, number> }>('/api/admin/stats'), refetchInterval: 30_000 });
  const s = q.data?.stats;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const cells: [string, number | undefined, string?][] = [
    ['Пользователей', s?.users_total], ['Активны за 24 ч', s?.users_active_24h], ['Заблокировано', s?.users_banned],
    ['Открытий кейсов', s?.case_openings], ['Улучшений', s?.upgrades], ['Ставок в рулетке', s?.roulette_bets, `раундов: ${fmt(s?.roulette_rounds)}`],
    ['Партий Blackjack', s?.blackjack_games], ['Всего игровых операций', s?.game_operations],
    ['Монет на балансах', s?.balance_total, 'виртуальная экономика'], ['Стоимость инвентарей', s?.inventory_value_total], ['Потрачено на кейсы', s?.coins_spent_cases],
    ['Открытых обращений', s?.open_support_threads],
  ];
  return (
    <>
      <PageTitle eyebrow="Обзор" title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cells.map(([l, v, h]) => (v === undefined ? <Skeleton key={l} className="h-20" /> : <Stat key={l} label={l} value={fmt(v)} hint={h} />))}
      </div>
    </>
  );
}

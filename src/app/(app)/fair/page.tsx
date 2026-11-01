'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { toast } from '@/lib/client/store';
import { Button, ConfirmDialog, ErrorState, PageTitle, Skeleton } from '@/components/ui/ui';
import { rollWeb, sha256Web } from '@/lib/fair-web';
import { fmtDate } from '@/lib/format';

type Active = { id: string; server_seed_hash: string; client_seed: string; nonce: number };
type Revealed = { id: string; server_seed: string; server_seed_hash: string; client_seed: string; nonce: number; revealed_at: string };

const Mono = ({ children }: { children: React.ReactNode }) => <p className="break-all rounded-lg bg-black/50 px-3 py-2 font-mono text-[12px] text-lime-100/90">{children}</p>;

export default function FairPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['fair'], queryFn: () => api<{ active: Active; revealed: Revealed[] }>('/api/fair') });
  const [confirm, setConfirm] = useState(false);
  const [clientSeed, setClientSeed] = useState('');
  const rotate = useAction(() => api('/api/fair/rotate', { body: clientSeed.trim() ? { clientSeed: clientSeed.trim() } : {} }), {
    onSuccess: () => { setConfirm(false); setClientSeed(''); toast.success('Seed обновлён', 'Прежний server seed раскрыт ниже'); qc.invalidateQueries({ queryKey: ['fair'] }); },
  });

  const [v, setV] = useState({ server: '', client: '', nonce: '0' });
  const [out, setOut] = useState<{ hash: string; roll: number } | null>(null);
  async function verify() {
    if (!v.server || !v.client) return toast.error('Заполните server seed и client seed');
    setOut({ hash: await sha256Web(v.server), roll: await rollWeb(v.server, v.client, Number(v.nonce) || 0) });
  }

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  return (
    <>
      <PageTitle eyebrow="Provably fair" title="Честность" />
      <p className="mb-5 text-sm leading-relaxed text-white/55">
        Каждый результат вычисляется на сервере: <span className="font-mono text-lime-200">roll = HMAC_SHA256(server_seed, client_seed:nonce:cursor)</span> → число от 0 до 1.
        Заранее вам показывается только хэш server seed. После обновления seed мы раскрываем прежний — и вы можете пересчитать все свои результаты.
      </p>

      <section className="panel space-y-3 p-4">
        <h2 className="h-display text-2xl text-white">Текущий seed</h2>
        {!q.data ? <Skeleton className="h-28" /> : (
          <>
            <div><p className="mb-1 text-[11px] uppercase tracking-widest text-white/40">SHA-256 хэш server seed</p><Mono>{q.data.active.server_seed_hash}</Mono></div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div><p className="mb-1 text-[11px] uppercase tracking-widest text-white/40">Client seed</p><Mono>{q.data.active.client_seed}</Mono></div>
              <div><p className="mb-1 text-[11px] uppercase tracking-widest text-white/40">Nonce</p><Mono>{q.data.active.nonce}</Mono></div>
            </div>
            <input className="input" placeholder="Свой client seed (необязательно)" value={clientSeed} maxLength={64} onChange={(e) => setClientSeed(e.target.value.replace(/[^\w-]/g, ''))} />
            <Button variant="dark" full onClick={() => setConfirm(true)}>Раскрыть и сменить seed</Button>
          </>
        )}
      </section>

      <section className="panel mt-4 space-y-3 p-4">
        <h2 className="h-display text-2xl text-white">Проверка результата</h2>
        <p className="text-xs text-white/40">Вычисляется прямо в вашем браузере.</p>
        <input className="input" placeholder="Server seed (раскрытый)" value={v.server} onChange={(e) => setV({ ...v, server: e.target.value.trim() })} />
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <input className="input" placeholder="Client seed" value={v.client} onChange={(e) => setV({ ...v, client: e.target.value.trim() })} />
          <input className="input" inputMode="numeric" placeholder="Nonce" value={v.nonce} onChange={(e) => setV({ ...v, nonce: e.target.value.replace(/\D/g, '') })} />
        </div>
        <Button full onClick={verify}>Проверить</Button>
        {out && <div className="space-y-2"><p className="text-xs text-white/40">Хэш seed</p><Mono>{out.hash}</Mono><p className="text-xs text-white/40">Roll (0 ≤ x &lt; 1)</p><Mono>{out.roll.toFixed(12)}</Mono></div>}
      </section>

      <h2 className="h-display mb-3 mt-8 text-[20px] text-white">Раскрытые seed</h2>
      {!q.data?.revealed.length ? <p className="panel px-5 py-6 text-center text-sm text-white/40">Пока нет раскрытых seed.</p> : (
        <ul className="space-y-3">
          {q.data.revealed.map((r) => (
            <li key={r.id} className="panel space-y-2 p-4">
              <p className="text-xs text-white/40">Раскрыт {fmtDate(r.revealed_at)} · использовано nonce: {r.nonce}</p>
              <Mono>server: {r.server_seed}</Mono><Mono>client: {r.client_seed}</Mono><Mono>hash: {r.server_seed_hash}</Mono>
              <Button variant="ghost" size="sm" onClick={() => { setV({ server: r.server_seed, client: r.client_seed, nonce: '1' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Подставить в проверку</Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} loading={rotate.isPending} title="Раскрыть seed?" confirmLabel="Раскрыть"
        text="Текущий server seed станет публичным, а для новых игр будет создан новый. Сменить seed нельзя во время активной партии Blackjack." onConfirm={() => rotate.mutate(undefined)} />
    </>
  );
}

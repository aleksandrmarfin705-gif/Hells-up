'use client';
import { Suspense, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '@/lib/client/api';
import { useAction, useMe } from '@/lib/client/hooks';
import { haptic } from '@/lib/client/telegram';
import { Gauge, type GaugeHandle } from '@/components/game/Gauge';
import { ItemArt } from '@/components/game/ItemArt';
import { ItemCard } from '@/components/game/Cards';
import { Reveal } from '@/components/game/Reveal';
import { Modal } from '@/components/ui/Modal';
import { Button, ConfirmDialog, EmptyState, ErrorState, Money, PageTitle, Skeleton } from '@/components/ui/ui';
import { IconUpgrade } from '@/components/brand/Icons';
import { upgradeChanceBp, MIN_UPGRADE_CHANCE_BP } from '@/lib/game/upgrade';
import { rarityOf } from '@/lib/rarity';
import { fmtDate, fmtPct } from '@/lib/format';
import type { InventoryItem, Item } from '@/lib/types';

type UpgradeResult = { success: boolean; chance_bp: number; roll: number; input: Item; target: Item; fair: { nonce: number; server_seed_hash: string } };
type HistoryRow = { id: string; chance_bp: number; success: boolean; created_at: string; input: Item; target: Item };

function UpgradeInner() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const { data: me } = useMe();
  const inv = useQuery({ queryKey: ['inventory'], queryFn: () => api<{ items: InventoryItem[] }>('/api/inventory') });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => api<{ items: Item[] }>('/api/items'), staleTime: 60_000 });
  const hist = useQuery({ queryKey: ['upgrade-history'], queryFn: () => api<{ rows: HistoryRow[] }>('/api/history?type=upgrades&size=6') });

  const [srcId, setSrcId] = useState<string | null>(params.get('item'));
  const [target, setTarget] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [picker, setPicker] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'spin' | 'done'>('idle');
  const [result, setResult] = useState<UpgradeResult | null>(null);
  const gauge = useRef<GaugeHandle>(null);

  const src = inv.data?.items.find((i) => i.id === srcId) ?? null;
  const edge = me?.settings.upgrade_edge_bp ?? 500;
  const maxBp = me?.settings.upgrade_max_chance_bp ?? 9500;

  const targets = useMemo(() => {
    if (!src || !catalog.data) return [];
    const sp = Number(src.item.virtual_price);
    return catalog.data.items
      .filter((t) => Number(t.virtual_price) > sp && upgradeChanceBp(sp, Number(t.virtual_price), edge, maxBp) >= MIN_UPGRADE_CHANCE_BP)
      .sort((a, b) => Number(a.virtual_price) - Number(b.virtual_price));
  }, [src, catalog.data, edge, maxBp]);

  const chanceBp = src && target ? upgradeChanceBp(Number(src.item.virtual_price), Number(target.virtual_price), edge, maxBp) : 0;
  const color = target ? rarityOf(target.rarity).color : '#c6f432';

  const run = useAction(() => api<UpgradeResult>('/api/upgrade', { body: { userItemId: srcId, targetItemId: target!.id, key: newKey() } }), {
    onSuccess: async (r) => {
      setConfirm(false);
      setResult(r);
      setPhase('spin');
      await new Promise((res) => setTimeout(res, 80));
      await gauge.current?.spinTo(r.roll);
      haptic.notify(r.success ? 'success' : 'error');
      setPhase('done');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['upgrade-history'] });
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });

  function reset() { setPhase('idle'); setResult(null); setSrcId(null); setTarget(null); }

  if (inv.isError) return <ErrorState onRetry={() => inv.refetch()} />;
  const busy = phase !== 'idle' || run.isPending;

  return (
    <>
      <PageTitle eyebrow="Режим Upgrade" title="Улучшение" />
      {inv.isLoading ? <Skeleton className="h-80" /> : !inv.data?.items.length ? (
        <EmptyState icon={<IconUpgrade size={44} />} title="Нет предметов для улучшения" text="Откройте кейс и получите первый предмет." action={<Link href="/cases"><Button>К кейсам</Button></Link>} />
      ) : (
        <>
          <section className="panel relative overflow-hidden px-4 py-6">
            <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 45%, ${color}1f, transparent 70%)` }} />
            <Gauge ref={gauge} chance={chanceBp / 10000} color={color} size={250}>
              {chanceBp > 0 ? (
                <>
                  <p className="h-display accent-text text-[52px] leading-none">{fmtPct(chanceBp / 10000)}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/40">шанс успеха</p>
                </>
              ) : <p className="px-8 text-center text-xs text-white/40">Выберите предмет и цель</p>}
            </Gauge>

            <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <SlotBtn label="Ваш предмет" item={src?.item ?? null} onClick={() => !busy && setPicker(true)} />
              <span className="text-lime-400"><IconUpgrade size={26} /></span>
              <SlotBtn label="Цель" item={target} disabled={!src} onClick={() => {}} fixed />
            </div>
            {src && target && (
              <p className="relative mt-4 text-center text-xs text-white/45">
                <Money value={Number(src.item.virtual_price)} size={12} /> → <Money value={Number(target.virtual_price)} size={12} /> · при неудаче предмет будет потерян
              </p>
            )}
            <Button size="lg" full className="relative mt-5" disabled={!src || !target || busy || !me?.settings.upgrade_enabled} loading={run.isPending} onClick={() => setConfirm(true)}>
              {me?.settings.upgrade_enabled === false ? 'Режим отключён' : 'Улучшить'}
            </Button>
          </section>

          {src && (
            <>
              <h2 className="h-display mb-3 mt-8 text-[20px] text-white">Выберите цель</h2>
              {catalog.isLoading ? <Skeleton className="h-40" /> : !targets.length ? (
                <p className="panel px-5 py-8 text-center text-sm text-white/45">Для этого предмета нет доступных целей — попробуйте предмет подешевле.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {targets.map((t) => {
                    const bp = upgradeChanceBp(Number(src.item.virtual_price), Number(t.virtual_price), edge, maxBp);
                    return <ItemCard key={t.id} item={t} selected={target?.id === t.id} onClick={() => { haptic.select(); setTarget(t); }}
                      footer={<p className="text-center text-[11px] font-semibold text-lime-300">шанс {fmtPct(bp / 10000)}</p>} />;
                  })}
                </div>
              )}
            </>
          )}

          <h2 className="h-display mb-3 mt-9 text-[20px] text-white">История улучшений</h2>
          {!hist.data?.rows.length ? <p className="panel px-5 py-6 text-center text-sm text-white/40">Пока нет улучшений.</p> : (
            <ul className="panel divide-y divide-white/5 overflow-hidden">
              {hist.data.rows.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <ItemArt art={h.input.art} rarity={h.input.rarity} size={34} glow={false} />
                  <span className="text-white/30">→</span>
                  <ItemArt art={h.target.art} rarity={h.target.rarity} size={34} glow={false} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{h.target.name}</p><p className="text-xs text-white/40">{fmtDate(h.created_at)} · {fmtPct(h.chance_bp / 10000)}</p></div>
                  <span className={`text-xs font-semibold ${h.success ? 'text-emerald-400' : 'text-rarity-mythic'}`}>{h.success ? 'Успех' : 'Потеря'}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* выбор исходного предмета */}
      <Modal open={picker} onOpenChange={setPicker} title="Ваш предмет" description="Предмет будет потрачен при неудаче">
        <div className="grid max-h-[60dvh] grid-cols-2 gap-3 overflow-y-auto">
          {inv.data?.items.map((i) => (
            <ItemCard key={i.id} item={i.item} selected={i.id === srcId} onClick={() => { setSrcId(i.id); setTarget(null); setPicker(false); }} />
          ))}
        </div>
      </Modal>

      <ConfirmDialog open={confirm} onOpenChange={setConfirm} loading={run.isPending} title="Запустить улучшение?" confirmLabel="Улучшить"
        text={src && target && <>«{src.item.name}» → «{target.name}». Шанс успеха <b className="text-lime-200">{fmtPct(chanceBp / 10000)}</b>. При неудаче «{src.item.name}» будет потерян безвозвратно.</>}
        onConfirm={() => run.mutate(undefined)} />

      {/* анимация + итог */}
      <Modal open={phase !== 'idle'} onOpenChange={() => {}} dismissible={false} className="md:max-w-md">
        {result && phase === 'spin' && (
          <div className="py-4">
            <p className="eyebrow mb-3 text-center">Улучшаем…</p>
            <Gauge ref={gauge} chance={result.chance_bp / 10000} color={color} size={240}>
              <p className="h-display accent-text text-5xl">{fmtPct(result.chance_bp / 10000)}</p>
            </Gauge>
          </div>
        )}
        {result && phase === 'done' && (
          <div>
            <Reveal item={result.success ? result.target : result.input} lost={!result.success} caption={result.success ? 'Улучшение удалось' : 'Улучшение не удалось — предмет потерян'} />
            <div className="mt-5 grid gap-2.5">
              <Button size="lg" onClick={reset}>Продолжить</Button>
              <Link href="/inventory"><Button variant="dark" full>В инвентарь</Button></Link>
            </div>
            <p className="mt-3 text-center text-[10px] text-white/30">roll {result.roll.toFixed(6)} · nonce {result.fair.nonce}</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function SlotBtn({ label, item, onClick, disabled, fixed }: { label: string; item: Item | null; onClick: () => void; disabled?: boolean; fixed?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled || fixed} className="rounded-2xl border border-dashed border-lime-400/30 bg-black/30 p-3 text-center transition enabled:active:scale-95 disabled:opacity-60">
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</p>
      {item ? <><ItemArt art={item.art} rarity={item.rarity} imageUrl={item.image_url} size={64} className="mx-auto" /><p className="mt-1 truncate text-xs font-medium text-white">{item.name}</p></> :
        <div className="flex h-[88px] items-center justify-center text-3xl text-white/15">+</div>}
    </button>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <UpgradeInner />
    </Suspense>
  );
}

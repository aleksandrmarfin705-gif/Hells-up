'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { toast } from '@/lib/client/store';
import { CaseArt } from '@/components/game/CaseArt';
import { Modal } from '@/components/ui/Modal';
import { Button, ConfirmDialog, ErrorState, Money, PageTitle, Skeleton } from '@/components/ui/ui';
import { IconEdit, IconTrash } from '@/components/brand/Icons';
import { CASE_ARTS } from '@/lib/admin-schemas';
import { fmtPct } from '@/lib/format';
import type { Item } from '@/lib/types';

type AdminCase = { id: string; name: string; description: string; price: number; accent: string; art: string; image_url: string | null; is_active: boolean; is_featured: boolean; sort_order: number; item_count: number; expected_value: number; rtp: number | null };
const empty = { name: '', description: '', price: '100', accent: '#d4af37', art: 'chest', image_url: '', is_active: true, is_featured: false, sort_order: '0' };

export default function AdminCases() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-cases'], queryFn: () => api<{ cases: AdminCase[] }>('/api/admin/cases') });
  const [edit, setEdit] = useState<(typeof empty & { id?: string }) | null>(null);
  const [del, setDel] = useState<AdminCase | null>(null);
  const [comp, setComp] = useState<AdminCase | null>(null);
  const done = () => { qc.invalidateQueries({ queryKey: ['admin-cases'] }); qc.invalidateQueries({ queryKey: ['cases'] }); qc.invalidateQueries({ queryKey: ['home'] }); };

  const save = useAction(() => {
    const e = edit!;
    const body = { name: e.name, description: e.description, price: Math.floor(Number(e.price)), accent: e.accent, art: e.art, image_url: e.image_url || null, is_active: e.is_active, is_featured: e.is_featured, sort_order: Math.floor(Number(e.sort_order)) || 0 };
    return e.id ? api(`/api/admin/cases/${e.id}`, { method: 'PATCH', body }) : api('/api/admin/cases', { body });
  }, { onSuccess: () => { toast.success('Кейс сохранён'); setEdit(null); done(); } });
  const remove = useAction((id: string) => api<{ disabled?: boolean }>(`/api/admin/cases/${id}`, { method: 'DELETE', body: undefined }), {
    onSuccess: (r) => { toast.success(r.disabled ? 'Есть история открытий — кейс отключён' : 'Кейс удалён'); setDel(null); done(); },
  });

  return (
    <>
      <PageTitle eyebrow="Каталог" title="Кейсы" right={<Button size="sm" onClick={() => setEdit({ ...empty })}>Создать</Button>} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-72" /> : (
        <ul className="space-y-3">
          {q.data?.cases.map((c) => (
            <li key={c.id} className={`panel flex items-center gap-3 p-3 ${c.is_active ? '' : 'opacity-50'}`}>
              <CaseArt art={c.art} accent={c.accent} imageUrl={c.image_url} size={64} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{c.name} {c.is_featured && <span className="text-[10px] text-gold-300">★</span>}</p>
                <p className="text-xs text-white/40">{c.item_count} предметов · EV {c.expected_value} {c.rtp != null && <span className={c.rtp > 1 ? 'text-rarity-mythic' : 'text-emerald-400'}>· возврат {fmtPct(c.rtp)}</span>}</p>
                <Money value={Number(c.price)} size={12} className="text-sm text-gold-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="dark" onClick={() => setComp(c)}>Состав</Button>
                <div className="flex justify-end gap-1">
                  <button aria-label="Изменить" className="p-1.5 text-white/50 hover:text-white" onClick={() => setEdit({ ...c, price: String(c.price), image_url: c.image_url ?? '', sort_order: String(c.sort_order) })}><IconEdit size={18} /></button>
                  <button aria-label="Удалить" className="p-1.5 text-white/40 hover:text-rarity-mythic" onClick={() => setDel(c)}><IconTrash size={18} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?.id ? 'Изменить кейс' : 'Новый кейс'}>
        {edit && (
          <div className="space-y-3">
            <input className="input" placeholder="Название" maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <textarea className="input min-h-[70px] resize-none" placeholder="Описание" maxLength={500} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" inputMode="numeric" placeholder="Цена" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value.replace(/\D/g, '') })} />
              <input className="input" inputMode="numeric" placeholder="Порядок" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: e.target.value.replace(/[^\d-]/g, '') })} />
              <select className="input" value={edit.art} onChange={(e) => setEdit({ ...edit, art: e.target.value })}>{CASE_ARTS.map((a) => <option key={a} value={a}>{a}</option>)}</select>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-3"><input type="color" value={edit.accent} onChange={(e) => setEdit({ ...edit, accent: e.target.value })} className="h-8 w-10 bg-transparent" /><span className="text-xs text-white/50">{edit.accent}</span></label>
            </div>
            <input className="input" placeholder="Ссылка на изображение (https, необязательно)" value={edit.image_url} onChange={(e) => setEdit({ ...edit, image_url: e.target.value.trim() })} />
            <div className="flex gap-5 text-sm text-white/70">
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} className="h-4 w-4 accent-[#d4af37]" />Активен</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.is_featured} onChange={(e) => setEdit({ ...edit, is_featured: e.target.checked })} className="h-4 w-4 accent-[#d4af37]" />Популярный</label>
            </div>
            <Button full size="lg" loading={save.isPending} disabled={!edit.name.trim()} onClick={() => save.mutate(undefined)}>Сохранить</Button>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="Удалить кейс?" confirmLabel="Удалить" loading={remove.isPending}
        text={<>«{del?.name}» будет удалён. Если по нему уже есть история открытий — он будет только отключён.</>} onConfirm={() => del && remove.mutate(del.id)} />
      {comp && <Composition c={comp} onClose={() => setComp(null)} onSaved={done} />}
    </>
  );
}

function Composition({ c, onClose, onSaved }: { c: AdminCase; onClose: () => void; onSaved: () => void }) {
  const detail = useQuery({ queryKey: ['admin-case', c.id], queryFn: () => api<{ case: { case_items: { weight: number; item: Item }[] } }>(`/api/admin/cases/${c.id}`) });
  const all = useQuery({ queryKey: ['admin-items'], queryFn: () => api<{ items: Item[] }>('/api/admin/items') });
  const [rows, setRows] = useState<Record<string, number> | null>(null);
  const current = rows ?? Object.fromEntries((detail.data?.case.case_items ?? []).map((x) => [x.item.id, x.weight]));
  const items = useMemo(() => all.data?.items ?? [], [all.data]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const total = Object.values(current).reduce((s, w) => s + (w || 0), 0);
  const ev = total ? Object.entries(current).reduce((s, [id, w]) => s + (byId.get(id) ? Number(byId.get(id)!.virtual_price) * (w || 0) : 0), 0) / total : 0;
  const [add, setAdd] = useState('');

  const save = useAction(() => api(`/api/admin/cases/${c.id}/items`, { method: 'PUT', body: { items: Object.entries(current).filter(([, w]) => w > 0).map(([item_id, weight]) => ({ item_id, weight })) } }), {
    onSuccess: () => { toast.success('Состав сохранён'); onSaved(); onClose(); },
  });
  const auto = () => setRows(Object.fromEntries(Object.keys(current).map((id) => [id, Math.max(1, Math.round(1e9 / Math.max(1, Number(byId.get(id)?.virtual_price ?? 1))))])));

  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={`Состав: ${c.name}`} description="Шанс = вес / сумма весов">
      {detail.isLoading || all.isLoading ? <Skeleton className="h-40" /> : (
        <>
          <ul className="max-h-[46dvh] divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10">
            {Object.entries(current).sort(([a], [b]) => Number(byId.get(b)?.virtual_price ?? 0) - Number(byId.get(a)?.virtual_price ?? 0)).map(([id, w]) => (
              <li key={id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{byId.get(id)?.name ?? id}</p><p className="text-[11px] text-white/35">{byId.get(id)?.virtual_price} монет · {fmtPct(total ? (w || 0) / total : 0)}</p></div>
                <input inputMode="numeric" className="h-9 w-28 rounded-lg border border-white/10 bg-surface-2 px-2 text-right text-[16px] text-white outline-none focus:border-gold-400" value={w || ''} onChange={(e) => setRows({ ...current, [id]: Math.min(2_000_000_000, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
                <button className="p-1 text-white/40 hover:text-rarity-mythic" aria-label="Убрать" onClick={() => { const n = { ...current }; delete n[id]; setRows(n); }}><IconTrash size={16} /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <select className="input !py-2" value={add} onChange={(e) => setAdd(e.target.value)}>
              <option value="">Добавить предмет…</option>
              {items.filter((i) => !(i.id in current)).map((i) => <option key={i.id} value={i.id}>{i.name} · {i.virtual_price}</option>)}
            </select>
            <Button variant="dark" disabled={!add} onClick={() => { setRows({ ...current, [add]: 1000 }); setAdd(''); }}>+</Button>
          </div>
          <p className="mt-3 text-xs text-white/45">Ожидаемая стоимость выпадения: <b className="text-gold-200">{Math.round(ev)}</b>{c.price > 0 && ev > 0 && <> · возврат {fmtPct(ev / c.price)} от цены {c.price}</>}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="dark" onClick={auto}>Авто-веса (1/цена)</Button>
            <Button loading={save.isPending} disabled={!Object.values(current).some((w) => w > 0)} onClick={() => save.mutate(undefined)}>Сохранить</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

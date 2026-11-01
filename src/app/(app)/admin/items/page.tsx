'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { toast } from '@/lib/client/store';
import { ItemArt } from '@/components/game/ItemArt';
import { RarityBadge } from '@/components/game/RarityBadge';
import { Modal } from '@/components/ui/Modal';
import { Button, ConfirmDialog, ErrorState, Money, PageTitle, Skeleton } from '@/components/ui/ui';
import { IconEdit, IconTrash } from '@/components/brand/Icons';
import { ITEM_ARTS, RARITIES } from '@/lib/admin-schemas';
import { RARITY } from '@/lib/rarity';
import type { Item } from '@/lib/types';

const empty = { name: '', description: '', rarity: 'common', art: 'gem', image_url: '', virtual_price: '100', is_active: true };

export default function AdminItems() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-items'], queryFn: () => api<{ items: Item[] }>('/api/admin/items') });
  const [edit, setEdit] = useState<(typeof empty & { id?: string }) | null>(null);
  const [del, setDel] = useState<Item | null>(null);
  const done = () => { qc.invalidateQueries({ queryKey: ['admin-items'] }); qc.invalidateQueries({ queryKey: ['catalog'] }); };

  const save = useAction(() => {
    const e = edit!;
    const body = { name: e.name, description: e.description, rarity: e.rarity, art: e.art, image_url: e.image_url || null, virtual_price: Math.floor(Number(e.virtual_price)), is_active: e.is_active };
    return e.id ? api(`/api/admin/items/${e.id}`, { method: 'PATCH', body }) : api('/api/admin/items', { body });
  }, { onSuccess: () => { toast.success('Предмет сохранён'); setEdit(null); done(); } });
  const remove = useAction((id: string) => api<{ deleted?: boolean; disabled?: boolean }>(`/api/admin/items/${id}`, { method: 'DELETE', body: undefined }), {
    onSuccess: (r) => { toast.success(r.disabled ? 'Предмет используется — отключён' : 'Предмет удалён'); setDel(null); done(); },
  });

  return (
    <>
      <PageTitle eyebrow="Каталог" title="Предметы" right={<Button size="sm" onClick={() => setEdit({ ...empty })}>Создать</Button>} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-72" /> : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {q.data?.items.map((i) => (
            <li key={i.id} className={`flex items-center gap-3 px-4 py-3 ${i.is_active ? '' : 'opacity-45'}`}>
              <ItemArt art={i.art} rarity={i.rarity} imageUrl={i.image_url} size={42} glow={false} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{i.name}</p><RarityBadge rarity={i.rarity} className="mt-0.5" /></div>
              <Money value={Number(i.virtual_price)} size={12} className="text-sm text-lime-200" />
              <button aria-label="Изменить" className="p-1.5 text-white/50 hover:text-white" onClick={() => setEdit({ ...i, image_url: i.image_url ?? '', virtual_price: String(i.virtual_price) } as any)}><IconEdit size={18} /></button>
              <button aria-label="Удалить" className="p-1.5 text-white/40 hover:text-rarity-mythic" onClick={() => setDel(i)}><IconTrash size={18} /></button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?.id ? 'Изменить предмет' : 'Новый предмет'}>
        {edit && (
          <div className="space-y-3">
            <input className="input" placeholder="Название" maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <textarea className="input min-h-[70px] resize-none" placeholder="Описание" maxLength={500} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={edit.rarity} onChange={(e) => setEdit({ ...edit, rarity: e.target.value })}>{RARITIES.map((r) => <option key={r} value={r}>{RARITY[r].label}</option>)}</select>
              <select className="input" value={edit.art} onChange={(e) => setEdit({ ...edit, art: e.target.value })}>{ITEM_ARTS.map((a) => <option key={a} value={a}>{a}</option>)}</select>
            </div>
            <input className="input" inputMode="numeric" placeholder="Виртуальная цена" value={edit.virtual_price} onChange={(e) => setEdit({ ...edit, virtual_price: e.target.value.replace(/\D/g, '') })} />
            <input className="input" placeholder="Ссылка на изображение (https, необязательно)" value={edit.image_url} onChange={(e) => setEdit({ ...edit, image_url: e.target.value.trim() })} />
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} className="h-4 w-4 accent-[#c6f432]" />Активен</label>
            <Button full size="lg" loading={save.isPending} disabled={!edit.name.trim()} onClick={() => save.mutate(undefined)}>Сохранить</Button>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} danger title="Удалить предмет?" confirmLabel="Удалить" loading={remove.isPending}
        text={<>«{del?.name}» будет удалён. Если предмет уже выпадал или входит в кейсы, он будет только отключён.</>} onConfirm={() => del && remove.mutate(del.id)} />
    </>
  );
}

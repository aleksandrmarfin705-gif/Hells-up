'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { toast } from '@/lib/client/store';
import { Button, Skeleton } from '@/components/ui/ui';

export type Field = { key: string; label: string; type: 'text' | 'int' | 'bool' | 'area'; hint?: string };

export function SettingsEditor({ fields, title }: { fields: Field[]; title?: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => api<{ settings: Record<string, any> }>('/api/admin/settings') });
  const [draft, setDraft] = useState<Record<string, any>>({});
  const val = (k: string) => (k in draft ? draft[k] : q.data?.settings[k]);
  const save = useAction(() => api('/api/admin/settings', { method: 'PATCH', body: draft }), {
    onSuccess: () => { toast.success('Настройки сохранены', 'Изменения записаны в аудит'); setDraft({}); qc.invalidateQueries({ queryKey: ['admin-settings'] }); qc.invalidateQueries({ queryKey: ['me'] }); },
  });
  if (!q.data) return <Skeleton className="h-72" />;
  return (
    <section className="panel space-y-4 p-5">
      {title && <h2 className="h-display text-2xl text-white">{title}</h2>}
      {fields.map((f) => (
        <div key={f.key}>
          {f.type === 'bool' ? (
            <label className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-white/80">{f.label}</span>
              <input type="checkbox" className="h-5 w-5 accent-[#d4af37]" checked={!!val(f.key)} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked })} />
            </label>
          ) : (
            <>
              <label className="mb-1 block text-xs text-white/50">{f.label}</label>
              {f.type === 'area' ? (
                <textarea className="input min-h-[80px] resize-none" value={val(f.key) ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
              ) : (
                <input className="input" inputMode={f.type === 'int' ? 'numeric' : 'text'} value={val(f.key) ?? ''}
                  onChange={(e) => setDraft({ ...draft, [f.key]: f.type === 'int' ? Number(e.target.value.replace(/\D/g, '')) : e.target.value })} />
              )}
            </>
          )}
          {f.hint && <p className="mt-1 text-[11px] text-white/35">{f.hint}</p>}
        </div>
      ))}
      <Button full size="lg" loading={save.isPending} disabled={!Object.keys(draft).length} onClick={() => save.mutate(undefined)}>Сохранить</Button>
    </section>
  );
}

'use client';
import { useEffect } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useMe } from '@/lib/client/hooks';

let client: SupabaseClient | null = null;
let clientKey = '';

function getClient(url: string, anonKey: string, token: string | null) {
  const key = `${url}|${token ?? ''}`;
  if (!client || clientKey !== key) {
    client?.removeAllChannels();
    client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 10 } } });
    if (token) client.realtime.setAuth(token);
    clientKey = key;
  }
  return client;
}

/**
 * Подписка на изменения таблицы через Supabase Realtime. Событие используется как сигнал «обновить данные»
 * (сами данные всегда перечитываются через защищённый API), поэтому без Realtime всё работает через polling.
 */
export function useRealtimeTable(table: string, onChange: () => void, opts: { filter?: string; privateToken?: boolean; enabled?: boolean } = {}) {
  const { data: me } = useMe();
  const rt = me?.realtime;
  const enabled = opts.enabled !== false && !!rt && (!opts.privateToken || !!rt.token);
  useEffect(() => {
    if (!enabled || !rt) return;
    const c = getClient(rt.url, rt.anonKey, rt.token);
    const name = `${table}-${opts.filter ?? 'all'}-${Math.random().toString(36).slice(2, 7)}`;
    const ch = c
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(opts.filter ? { filter: opts.filter } : {}) }, () => onChange())
      .subscribe();
    return () => { void c.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rt?.url, rt?.token, table, opts.filter]);
  return enabled;
}

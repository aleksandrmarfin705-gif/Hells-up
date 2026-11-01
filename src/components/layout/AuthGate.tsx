'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api, ApiClientError, setApiToken, setUnauthorizedHandler } from '@/lib/client/api';
import { initTelegram, tg } from '@/lib/client/telegram';
import { Logo } from '@/components/brand/Logo';
import { Button, Skeleton } from '@/components/ui/ui';
import type { MeResponse } from '@/lib/types';

type Health = { database: boolean; telegram: boolean; session: boolean; demoAvailable: boolean };
type State = { status: 'boot' } | { status: 'ready' } | { status: 'error'; code: string; message: string; health?: Health };

export function AuthGate({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [state, setState] = useState<State>({ status: 'boot' });
  const loggingIn = useRef<Promise<boolean> | null>(null);

  const login = useCallback((): Promise<boolean> => {
    if (loggingIn.current) return loggingIn.current;
    const p = (async () => {
      try {
        const initData: string = tg()?.initData ?? '';
        if (initData) {
          const r = await api<{ token: string }>('/api/auth/telegram', { body: { initData } });
          setApiToken(r.token);
        } else {
          const health = await api<Health>('/api/health');
          if (health.demoAvailable) {
            const r = await api<{ token: string }>('/api/auth/telegram', { body: { demo: true } });
            setApiToken(r.token);
          } else {
            setState({ status: 'error', code: health.database ? 'no_telegram' : 'not_configured', message: '', health });
            return false;
          }
        }
        await qc.fetchQuery({ queryKey: ['me'], queryFn: () => api<MeResponse>('/api/me'), staleTime: 0 });
        setState({ status: 'ready' });
        return true;
      } catch (e) {
        const code = e instanceof ApiClientError ? e.code : 'error';
        const message = e instanceof ApiClientError ? e.message : 'Не удалось запустить приложение';
        let health: Health | undefined;
        if (code === 'not_configured') health = await api<Health>('/api/health').catch(() => undefined);
        setState({ status: 'error', code, message, health });
        return false;
      } finally {
        loggingIn.current = null;
      }
    })();
    loggingIn.current = p;
    return p;
  }, [qc]);

  useEffect(() => {
    initTelegram();
    setUnauthorizedHandler(login);
    void login();
    return () => setUnauthorizedHandler(null);
  }, [login]);

  if (state.status === 'ready') return <>{children}</>;
  if (state.status === 'boot') return <BootScreen />;
  return <ErrorScreen state={state} retry={() => { setState({ status: 'boot' }); void login(); }} />;
}

function BootScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <motion.div animate={{ opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] }} transition={{ duration: 2.4, repeat: Infinity }}>
        <Logo size={56} />
      </motion.div>
      <div className="w-48 space-y-2">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="mx-auto h-2 w-2/3" />
      </div>
    </div>
  );
}

function Row({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface-2 px-4 py-3">
      <span className={`mt-1 h-2.5 w-2.5 flex-none rounded-full ${ok ? 'bg-emerald-400' : 'bg-rarity-mythic'}`} />
      <span className="text-left">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-white/45">{ok ? 'Подключено' : hint}</span>
      </span>
    </li>
  );
}

function ErrorScreen({ state, retry }: { state: Extract<State, { status: 'error' }>; retry: () => void }) {
  const h = state.health;
  const titles: Record<string, string> = {
    not_configured: 'Приложение ещё не подключено',
    no_telegram: 'Откройте в Telegram',
    banned: 'Доступ закрыт',
    maintenance: 'Технические работы',
    bad_init_data: 'Не удалось войти',
  };
  const text: Record<string, string> = {
    no_telegram: 'HELLS UP работает как Telegram Mini App. Откройте бота в Telegram и нажмите кнопку запуска.',
    banned: state.message,
    maintenance: state.message,
    bad_init_data: state.message,
  };
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Logo size={52} />
      <h1 className="h-display mt-8 text-3xl text-white">{titles[state.code] ?? 'Что-то пошло не так'}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/55">{text[state.code] ?? state.message}</p>
      {state.code === 'not_configured' && (
        <div className="mt-6 w-full">
          <p className="mb-3 text-sm text-white/55">Для запуска нужно подключить сервисы. Статус подключения:</p>
          <ul className="space-y-2">
            <Row ok={!!h?.database} label="Supabase (база данных)" hint="Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY" />
            <Row ok={!!h?.telegram} label="Telegram-бот" hint="Нужен TELEGRAM_BOT_TOKEN" />
            <Row ok={!!h?.session} label="Секрет сессий" hint="Нужен SESSION_SECRET (32+ символа)" />
          </ul>
          <p className="mt-4 text-xs text-white/35">Инструкция — в README.md, раздел «Подключение».</p>
        </div>
      )}
      {!['banned'].includes(state.code) && <Button variant="dark" className="mt-8" onClick={retry}>Повторить</Button>}
    </div>
  );
}

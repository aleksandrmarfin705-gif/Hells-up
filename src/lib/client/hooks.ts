'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/client/api';
import { haptic } from '@/lib/client/telegram';
import { toast } from '@/lib/client/store';
import type { MeResponse } from '@/lib/types';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<MeResponse>('/api/me'), staleTime: 30_000 });

export function useSetBalance() {
  const qc = useQueryClient();
  return (balance: number) =>
    qc.setQueryData<MeResponse>(['me'], (old) => (old ? { ...old, user: { ...old.user, balance: Number(balance) } } : old));
}

export const errMessage = (e: unknown) => (e instanceof ApiClientError ? e.message : 'Что-то пошло не так');

/** Мутация с тостом об ошибке и тактильным откликом. */
export function useAction<TVars, TData>(fn: (v: TVars) => Promise<TData>, opts?: { onSuccess?: (d: TData) => void; silent?: boolean }) {
  return useMutation({
    mutationFn: fn,
    onSuccess: opts?.onSuccess,
    onError: (e) => {
      haptic.notify('error');
      if (!opts?.silent) toast.error('Не получилось', errMessage(e));
    },
  });
}

/** Обратный отсчёт до момента (мс, серверное время компенсируется через offset). */
export function useCountdown(targetMs: number | null, offsetMs = 0) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offsetMs), 200);
    return () => clearInterval(t);
  }, [offsetMs]);
  return targetMs === null ? 0 : Math.max(0, targetMs - now);
}

export function usePrevious<T>(v: T) {
  const ref = useRef<T>(v);
  useEffect(() => { ref.current = v; });
  return ref.current;
}

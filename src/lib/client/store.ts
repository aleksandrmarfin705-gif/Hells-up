import { create } from 'zustand';

export type Toast = { id: number; kind: 'success' | 'error' | 'info'; title: string; text?: string };

type ToastState = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
};

let seq = 0;
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.kind === 'error' ? 5000 : 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = {
  success: (title: string, text?: string) => useToasts.getState().push({ kind: 'success', title, text }),
  error: (title: string, text?: string) => useToasts.getState().push({ kind: 'error', title, text }),
  info: (title: string, text?: string) => useToasts.getState().push({ kind: 'info', title, text }),
};

/* Обёртка над официальным Telegram Mini Apps SDK (telegram-web-app.js). Безопасна вне Telegram. */
export const tg = (): any => (typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined);

export const isInTelegram = () => Boolean(tg()?.initData);

export function initTelegram() {
  const w = tg();
  if (!w) return;
  try {
    w.ready();
    w.expand();
    w.setHeaderColor?.('#050505');
    w.setBackgroundColor?.('#050505');
    w.setBottomBarColor?.('#050505');
    w.disableVerticalSwipes?.();
  } catch {
    /* старые версии клиента — игнорируем */
  }
}

export const haptic = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => { try { tg()?.HapticFeedback?.impactOccurred(style); } catch {} },
  notify: (type: 'success' | 'error' | 'warning') => { try { tg()?.HapticFeedback?.notificationOccurred(type); } catch {} },
  select: () => { try { tg()?.HapticFeedback?.selectionChanged(); } catch {} },
};

export function openTelegramLink(url: string) {
  const w = tg();
  if (w?.openTelegramLink) w.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}

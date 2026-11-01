const nf = new Intl.NumberFormat('ru-RU');
export const fmt = (n: number | null | undefined) => nf.format(Math.round(Number(n ?? 0)));

export function fmtCompact(n: number): string {
  const v = Math.abs(n);
  if (v >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' млрд';
  if (v >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' млн';
  if (v >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + ' тыс';
  return fmt(n);
}

export function fmtPct(x: number): string {
  const p = x * 100;
  if (p === 0) return '0%';
  if (p < 0.01) return '<0.01%';
  if (p < 1) return p.toFixed(2) + '%';
  if (p < 10) return p.toFixed(1) + '%';
  return p.toFixed(0) + '%';
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDay = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return `${Math.floor(s / 86400)} дн назад`;
}

export const displayName = (u: { first_name?: string | null; last_name?: string | null; username?: string | null }) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? '@' + u.username : 'Игрок');

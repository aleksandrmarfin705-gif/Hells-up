import { route, pageParams } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({ auth: 'admin' }, async ({ query }) => {
  const { page, size, from, to } = pageParams(query, 20);
  const raw = (query.get('q') ?? '').trim().replace(/[%,()*\\]/g, '').slice(0, 64);
  let q = db().from('users')
    .select('id,telegram_id,username,first_name,last_name,balance,is_banned,created_at,last_seen_at', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (/^\d+$/.test(raw)) q = q.eq('telegram_id', Number(raw));
  else if (raw) q = q.ilike('username', `%${raw}%`);
  const res = await q.range(from, to);
  return { rows: check(res), total: res.count ?? 0, page, size };
});

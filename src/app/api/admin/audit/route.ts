import { route, pageParams } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({ auth: 'admin' }, async ({ query }) => {
  const { page, size, from, to } = pageParams(query, 30);
  const res = await db().from('audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  return { rows: check(res), total: res.count ?? 0, page, size };
});

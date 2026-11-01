import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({ auth: 'admin' }, async ({ query }) => {
  const status = query.get('status');
  let q = db().from('support_threads').select('id,subject,status,created_at,last_message_at,user:users(username,first_name,telegram_id)').order('last_message_at', { ascending: false }).limit(100);
  if (status === 'open' || status === 'closed') q = q.eq('status', status);
  return { threads: check(await q) };
});

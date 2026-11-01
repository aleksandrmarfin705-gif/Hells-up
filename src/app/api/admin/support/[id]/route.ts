import { z } from 'zod';
import { audit, route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { db, check } from '@/lib/supabase/admin';

async function thread(id: string) {
  if (!uuid.safeParse(id).success) throw new ApiError(404, 'not_found', 'Обращение не найдено');
  const rows = check(await db().from('support_threads').select('id,subject,status,created_at,user:users(id,username,first_name,telegram_id)').eq('id', id).limit(1)) as any[];
  if (!rows[0]) throw new ApiError(404, 'not_found', 'Обращение не найдено');
  return rows[0];
}

export const GET = route({ auth: 'admin' }, async ({ params }) => {
  const t = await thread(params.id);
  const messages = check(await db().from('support_messages').select('id,sender,body,created_at').eq('thread_id', t.id).order('created_at').limit(500));
  return { thread: t, messages };
});

const reply = z.object({ body: z.string().trim().min(1, 'Введите сообщение').max(2000) });

export const POST = route({ auth: 'admin', body: reply, limit: [30, 60] }, async ({ user, params, body }) => {
  const t = await thread(params.id);
  const [msg] = check(await db().from('support_messages').insert({ thread_id: t.id, sender: 'admin', author_id: user.id, body: body.body }).select('id,sender,body,created_at')) as any[];
  check(await db().from('support_threads').update({ last_message_at: new Date().toISOString() }).eq('id', t.id));
  await audit(user, 'support.reply', 'support_thread', t.id);
  return { message: msg };
});

const status = z.object({ status: z.enum(['open', 'closed']) });

export const PATCH = route({ auth: 'admin', body: status }, async ({ user, params, body }) => {
  const t = await thread(params.id);
  check(await db().from('support_threads').update({ status: body.status }).eq('id', t.id));
  await audit(user, body.status === 'closed' ? 'support.close' : 'support.reopen', 'support_thread', t.id);
  return { ok: true };
});

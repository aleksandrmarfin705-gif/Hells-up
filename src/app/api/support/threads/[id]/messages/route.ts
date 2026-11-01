import { z } from 'zod';
import { route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { db, check } from '@/lib/supabase/admin';

async function ownThread(userId: string, id: string) {
  if (!uuid.safeParse(id).success) throw new ApiError(404, 'not_found', 'Обращение не найдено');
  const rows = check(await db().from('support_threads').select('id,subject,status,created_at').eq('id', id).eq('user_id', userId).limit(1)) as any[];
  if (!rows[0]) throw new ApiError(404, 'not_found', 'Обращение не найдено');
  return rows[0];
}

export const GET = route({}, async ({ user, params }) => {
  const thread = await ownThread(user.id, params.id);
  const messages = check(await db().from('support_messages').select('id,sender,body,created_at').eq('thread_id', thread.id).order('created_at').limit(500));
  return { thread, messages };
});

const body = z.object({ body: z.string().trim().min(1, 'Введите сообщение').max(2000) });

export const POST = route({ body, limit: [20, 60] }, async ({ user, body, params }) => {
  const thread = await ownThread(user.id, params.id);
  if (thread.status === 'closed') throw new ApiError(409, 'thread_closed', 'Обращение закрыто — создайте новое');
  const [msg] = check(await db().from('support_messages').insert({ thread_id: thread.id, sender: 'user', author_id: user.id, body: body.body }).select('id,sender,body,created_at')) as any[];
  check(await db().from('support_threads').update({ last_message_at: new Date().toISOString() }).eq('id', thread.id));
  return { message: msg };
});

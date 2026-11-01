import { z } from 'zod';
import { route } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({}, async ({ user }) => ({
  threads: check(
    await db().from('support_threads').select('id,subject,status,created_at,last_message_at')
      .eq('user_id', user.id).order('last_message_at', { ascending: false }).limit(50),
  ),
}));

const body = z.object({
  subject: z.string().trim().min(1, 'Укажите тему').max(120),
  body: z.string().trim().min(1, 'Введите сообщение').max(2000),
});

export const POST = route({ body, limit: [6, 60] }, async ({ user, body }) => {
  const { count } = await db().from('support_threads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'open');
  if ((count ?? 0) >= 3) throw new ApiError(429, 'too_many_threads', 'Не больше 3 открытых обращений — дождитесь ответа или закройте старые');
  const [thread] = check(await db().from('support_threads').insert({ user_id: user.id, subject: body.subject }).select('id,subject,status,created_at,last_message_at')) as any[];
  check(await db().from('support_messages').insert({ thread_id: thread.id, sender: 'user', author_id: user.id, body: body.body }));
  return { thread };
});

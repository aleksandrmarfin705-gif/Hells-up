import { z } from 'zod';
import { audit, route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { db, check, rpc } from '@/lib/supabase/admin';

async function target(id: string) {
  if (!uuid.safeParse(id).success) throw new ApiError(404, 'not_found', 'Пользователь не найден');
  const rows = check(await db().from('users').select('*').eq('id', id).limit(1)) as any[];
  if (!rows[0]) throw new ApiError(404, 'not_found', 'Пользователь не найден');
  return rows[0];
}

export const GET = route({ auth: 'admin' }, async ({ params }) => {
  const user = await target(params.id);
  const [inventory, tx, stats] = await Promise.all([
    db().from('user_items').select('id,status,source,acquired_at,item:items(id,name,rarity,art,image_url,virtual_price)')
      .eq('user_id', user.id).eq('status', 'owned').order('acquired_at', { ascending: false }).limit(200),
    db().from('transactions').select('id,type,amount,balance_after,meta,created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(50),
    rpc('user_stats', { p_user: user.id }),
  ]);
  return { user, inventory: check(inventory), transactions: check(tx), stats };
});

const body = z.object({ is_banned: z.boolean(), ban_reason: z.string().trim().max(200).optional() });

/** Блокировка / разблокировка. Роль пользователя изменить нельзя — админы задаются только переменной ADMIN_TELEGRAM_IDS. */
export const PATCH = route({ auth: 'admin', body }, async ({ user: actor, params, body }) => {
  const u = await target(params.id);
  if (u.id === actor.id) throw new ApiError(400, 'self', 'Нельзя заблокировать самого себя');
  check(await db().from('users').update({ is_banned: body.is_banned, ban_reason: body.is_banned ? body.ban_reason ?? null : null }).eq('id', u.id));
  await audit(actor, body.is_banned ? 'user.ban' : 'user.unban', 'user', u.id, { reason: body.ban_reason ?? null, telegram_id: u.telegram_id });
  return { ok: true };
});

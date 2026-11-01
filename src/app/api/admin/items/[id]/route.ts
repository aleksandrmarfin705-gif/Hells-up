import { audit, route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { itemInput } from '@/lib/admin-schemas';
import { db, check } from '@/lib/supabase/admin';

export const PATCH = route({ auth: 'admin', body: itemInput }, async ({ user, params, body }) => {
  const id = uuid.parse(params.id);
  const rows = check(await db().from('items').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select('*')) as any[];
  if (!rows[0]) throw new ApiError(404, 'not_found', 'Предмет не найден');
  await audit(user, 'item.update', 'item', id, body);
  return { item: rows[0] };
});

/** Удаляет предмет; если он уже где-то используется — отключает (is_active=false). */
export const DELETE = route({ auth: 'admin' }, async ({ user, params }) => {
  const id = uuid.parse(params.id);
  const { error } = await db().from('items').delete().eq('id', id);
  if (error) {
    check(await db().from('items').update({ is_active: false }).eq('id', id));
    await audit(user, 'item.disable', 'item', id, { reason: 'используется' });
    return { disabled: true };
  }
  await audit(user, 'item.delete', 'item', id);
  return { deleted: true };
});

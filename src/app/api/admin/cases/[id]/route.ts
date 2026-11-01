import { audit, route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { caseInput } from '@/lib/admin-schemas';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({ auth: 'admin' }, async ({ params }) => {
  const id = uuid.parse(params.id);
  const rows = check(await db().from('cases').select('*, case_items(weight, item:items(id,name,rarity,art,image_url,virtual_price,is_active))').eq('id', id).limit(1)) as any[];
  if (!rows[0]) throw new ApiError(404, 'not_found', 'Кейс не найден');
  return { case: rows[0] };
});

export const PATCH = route({ auth: 'admin', body: caseInput }, async ({ user, params, body }) => {
  const id = uuid.parse(params.id);
  const rows = check(await db().from('cases').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select('*')) as any[];
  if (!rows[0]) throw new ApiError(404, 'not_found', 'Кейс не найден');
  await audit(user, 'case.update', 'case', id, body);
  return { case: rows[0] };
});

export const DELETE = route({ auth: 'admin' }, async ({ user, params }) => {
  const id = uuid.parse(params.id);
  const { error } = await db().from('cases').delete().eq('id', id);
  if (error) {
    check(await db().from('cases').update({ is_active: false }).eq('id', id));
    await audit(user, 'case.disable', 'case', id, { reason: 'есть история открытий' });
    return { disabled: true };
  }
  await audit(user, 'case.delete', 'case', id);
  return { deleted: true };
});

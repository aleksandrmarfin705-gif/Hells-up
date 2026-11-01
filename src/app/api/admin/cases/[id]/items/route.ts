import { audit, route, uuid } from '@/lib/api';
import { caseItemsInput } from '@/lib/admin-schemas';
import { db, check } from '@/lib/supabase/admin';

/** Полная замена состава кейса и весов (шансов). Шанс предмета = weight / сумма весов. */
export const PUT = route({ auth: 'admin', body: caseItemsInput }, async ({ user, params, body }) => {
  const id = uuid.parse(params.id);
  if (body.items.length) {
    check(await db().from('case_items').upsert(body.items.map((i) => ({ case_id: id, ...i })), { onConflict: 'case_id,item_id' }));
  }
  const keep = body.items.map((i) => i.item_id);
  let del = db().from('case_items').delete().eq('case_id', id);
  if (keep.length) del = del.not('item_id', 'in', `(${keep.join(',')})`);
  check(await del);
  await audit(user, 'case.items_update', 'case', id, { count: body.items.length, items: body.items });
  return { ok: true };
});

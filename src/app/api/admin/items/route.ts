import { audit, route } from '@/lib/api';
import { itemInput } from '@/lib/admin-schemas';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({ auth: 'admin' }, async () => ({
  items: check(await db().from('items').select('*').order('virtual_price')),
}));

export const POST = route({ auth: 'admin', body: itemInput }, async ({ user, body }) => {
  const [row] = check(await db().from('items').insert(body).select('*')) as any[];
  await audit(user, 'item.create', 'item', row.id, body);
  return { item: row };
});

import { audit, route } from '@/lib/api';
import { caseInput } from '@/lib/admin-schemas';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({ auth: 'admin' }, async () => {
  const rows = check(
    await db().from('cases').select('*, case_items(weight, item:items(id,name,rarity,virtual_price,is_active))').order('sort_order'),
  ) as any[];
  const cases = rows.map(({ case_items, ...c }) => {
    const items = (case_items as any[]).filter((x) => x.item?.is_active);
    const total = items.reduce((s, x) => s + x.weight, 0);
    const ev = total ? items.reduce((s, x) => s + Number(x.item.virtual_price) * x.weight, 0) / total : 0;
    return { ...c, item_count: case_items.length, expected_value: Math.round(ev), rtp: c.price > 0 ? ev / Number(c.price) : null };
  });
  return { cases };
});

export const POST = route({ auth: 'admin', body: caseInput }, async ({ user, body }) => {
  const [row] = check(await db().from('cases').insert(body).select('*')) as any[];
  await audit(user, 'case.create', 'case', row.id, body);
  return { case: row };
});

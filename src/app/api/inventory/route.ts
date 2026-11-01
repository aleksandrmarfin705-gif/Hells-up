import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({}, async ({ user }) => {
  const rows = check(
    await db()
      .from('user_items')
      .select('id,status,source,acquired_at,item:items(id,slug,name,description,rarity,art,image_url,virtual_price,is_active)')
      .eq('user_id', user.id)
      .eq('status', 'owned')
      .order('acquired_at', { ascending: false })
      .limit(1000),
  );
  return { items: rows };
});

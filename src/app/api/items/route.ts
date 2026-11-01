import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';

/** Каталог предметов для выбора цели улучшения. */
export const GET = route({}, async () => ({
  items: check(
    await db().from('items').select('id,name,rarity,art,image_url,virtual_price,description,is_active,slug')
      .eq('is_active', true).order('virtual_price'),
  ),
}));

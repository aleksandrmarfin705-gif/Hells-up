import { route } from '@/lib/api';
import { listCases, listEvents } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({}, async () => {
  const [cases, settings, rare] = await Promise.all([
    listCases(),
    getSettings(),
    db().from('items').select('id,name,rarity,art,image_url,virtual_price').eq('is_active', true)
      .in('rarity', ['epic', 'legendary', 'mythic']).order('virtual_price', { ascending: false }).limit(10),
  ]);
  const events = await listEvents(14, settings.show_demo_events !== false);
  const popular = cases.filter((c) => c.is_featured);
  return {
    popular: popular.length ? popular : cases.slice(0, 4),
    newest: [...cases].reverse().slice(0, 4),
    rareItems: check(rare),
    events,
  };
});

import { audit, route } from '@/lib/api';
import { settingsInput } from '@/lib/admin-schemas';
import { db, check } from '@/lib/supabase/admin';
import { getSettings, invalidateSettings } from '@/lib/settings';

export const GET = route({ auth: 'admin' }, async () => ({ settings: await getSettings() }));

export const PATCH = route({ auth: 'admin', body: settingsInput }, async ({ user, body }) => {
  const entries = Object.entries(body).filter(([, v]) => v !== undefined);
  if (entries.length) {
    check(await db().from('settings').upsert(entries.map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() })), { onConflict: 'key' }));
    invalidateSettings();
    await audit(user, 'settings.update', 'settings', null, Object.fromEntries(entries));
  }
  return { settings: await getSettings() };
});

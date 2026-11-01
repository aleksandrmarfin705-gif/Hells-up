import { route } from '@/lib/api';
import { getPublicSettings } from '@/lib/settings';
import { createRealtimeToken } from '@/lib/auth/session';
import type { MeResponse } from '@/lib/types';

export const GET = route({ ignoreMaintenance: true }, async ({ user, isAdmin }) => {
  const settings = await getPublicSettings();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const out: MeResponse = {
    user: {
      id: user.id, telegram_id: Number(user.telegram_id), username: user.username, first_name: user.first_name,
      last_name: user.last_name, photo_url: user.photo_url, balance: Number(user.balance),
      created_at: user.created_at, last_topup_at: user.last_topup_at,
    },
    isAdmin,
    settings,
    realtime: url && anonKey ? { url, anonKey, token: await createRealtimeToken(user.id, isAdmin) } : null,
  };
  return out;
});

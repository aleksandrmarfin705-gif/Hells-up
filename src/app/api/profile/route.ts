import { route } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';

export const GET = route({}, async ({ user }) => ({ stats: await rpc('user_stats', { p_user: user.id }) }));

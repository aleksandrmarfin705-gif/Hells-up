import { route } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';

export const GET = route({ auth: 'admin' }, async () => ({ stats: await rpc('admin_stats') }));

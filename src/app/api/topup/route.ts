import { route } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';

export const POST = route({ limit: [10, 60] }, async ({ user }) => rpc('claim_topup', { p_user: user.id }));

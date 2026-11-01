import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';
import { ensureSeed } from '@/lib/fair-server';

export const GET = route({}, async ({ user }) => {
  const active = await ensureSeed(user.id);
  const revealed = check(
    await db().from('rng_seeds').select('id,server_seed,server_seed_hash,client_seed,nonce,created_at,revealed_at')
      .eq('user_id', user.id).eq('active', false).order('created_at', { ascending: false }).limit(20),
  );
  return { active, revealed };
});

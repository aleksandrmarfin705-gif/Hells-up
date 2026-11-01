import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';
import { getActiveGame, toClient } from '@/lib/blackjack-server';

export const GET = route({}, async ({ user }) => {
  const game = await getActiveGame(user.id);
  const recent = check(
    await db().from('blackjack_games').select('id,bet,outcome,payout,created_at').eq('user_id', user.id)
      .eq('status', 'finished').order('created_at', { ascending: false }).limit(10),
  );
  return { game: game ? toClient(game) : null, recent };
});

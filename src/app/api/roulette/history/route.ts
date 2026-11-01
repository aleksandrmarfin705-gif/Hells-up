import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';

export const GET = route({}, async ({ user }) => {
  const mine = check(
    await db().from('roulette_bets')
      .select('id,bet_type,bet_value,amount,payout,created_at,round:roulette_rounds(round_no,result,result_color,status)')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
  );
  return { mine };
});

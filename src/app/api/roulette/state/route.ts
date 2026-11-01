import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';
import { tickRoulette } from '@/lib/roulette-server';

export const GET = route({ limit: [120, 60] }, async ({ user }) => {
  const round = await tickRoulette();
  const [bets, last] = await Promise.all([
    db().from('roulette_bets').select('id,user_id,display_name,bet_type,bet_value,amount,payout,created_at')
      .eq('round_id', round.id).order('created_at', { ascending: false }).limit(200),
    db().from('roulette_rounds').select('id,round_no,result,result_color,server_seed_hash,revealed_seed,settled_at')
      .eq('status', 'settled').order('round_no', { ascending: false }).limit(15),
  ]);
  const allBets = check(bets) as any[];
  // user_id наружу не отдаём — только флаг «моя ставка»
  const sanitized = allBets.map(({ user_id, ...b }) => ({ ...b, mine: user_id === user.id }));
  return { serverTime: Date.now(), round, bets: sanitized, last: check(last) };
});

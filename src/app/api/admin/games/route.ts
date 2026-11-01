import { route } from '@/lib/api';
import { db, check } from '@/lib/supabase/admin';

/** Последние игровые операции для модерации. */
export const GET = route({ auth: 'admin' }, async () => {
  const c = db();
  const [openings, upgrades, bets, games, rounds] = await Promise.all([
    c.from('case_openings').select('id,price_paid,created_at,user:users(username,telegram_id),case:cases(name),item:items(name,rarity,virtual_price)').order('created_at', { ascending: false }).limit(15),
    c.from('upgrades').select('id,chance_bp,success,created_at,user:users(username,telegram_id),input:items!upgrades_input_item_id_fkey(name),target:items!upgrades_target_item_id_fkey(name)').order('created_at', { ascending: false }).limit(15),
    c.from('roulette_bets').select('id,bet_type,bet_value,amount,payout,created_at,user:users(username,telegram_id)').order('created_at', { ascending: false }).limit(15),
    c.from('blackjack_games').select('id,bet,outcome,payout,status,created_at,user:users(username,telegram_id)').order('created_at', { ascending: false }).limit(15),
    c.from('roulette_rounds').select('id,round_no,status,result,result_color,settled_at').order('round_no', { ascending: false }).limit(10),
  ]);
  return { openings: check(openings), upgrades: check(upgrades), bets: check(bets), blackjack: check(games), rounds: check(rounds) };
});

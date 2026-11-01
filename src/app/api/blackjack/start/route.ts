import { z } from 'zod';
import { idKey, route } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';
import { takeRoll } from '@/lib/fair-server';
import { shuffledDeck } from '@/lib/fair';
import { deal, payoutFor } from '@/lib/game/blackjack';
import { getGame, toClient } from '@/lib/blackjack-server';

const body = z.object({ bet: z.number().int().positive().max(1_000_000_000), key: idKey });

export const POST = route({ body, limit: [40, 60] }, async ({ user, body }) => {
  const roll = await takeRoll(user.id);
  const deck = shuffledDeck(roll.serverSeed, roll.clientSeed, roll.nonce);
  const { state, finished, outcome } = deal(deck);
  const res = await rpc<{ game_id: string; balance: number }>('bj_start', {
    p_user: user.id,
    p_bet: body.bet,
    p_state: state,
    p_status: finished ? 'finished' : 'active',
    p_outcome: outcome,
    p_payout: finished && outcome ? payoutFor(body.bet, outcome) : 0,
    p_seed_id: roll.seedId,
    p_nonce: roll.nonce,
    p_key: body.key,
  });
  const game = await getGame(user.id, res.game_id);
  return { game: toClient(game!, Number(res.balance)) };
});

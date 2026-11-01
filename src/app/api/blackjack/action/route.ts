import { z } from 'zod';
import { route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { rpc } from '@/lib/supabase/admin';
import { applyAction, BjRuleError, payoutFor } from '@/lib/game/blackjack';
import { getGame, toClient } from '@/lib/blackjack-server';

const body = z.object({ gameId: uuid, version: z.number().int().min(0), action: z.enum(['hit', 'stand', 'double']) });

export const POST = route({ body, limit: [90, 60] }, async ({ user, body }) => {
  const game = await getGame(user.id, body.gameId);
  if (!game || game.status !== 'active') throw new ApiError(409, 'stale_game', 'Партия уже завершена');
  // защита от двойного нажатия: действие применяется только к той версии партии, которую видел игрок
  if (game.version !== body.version) throw new ApiError(409, 'stale_game', 'Партия уже изменилась — обновите экран');
  let r;
  try {
    r = applyAction(game.state, body.action);
  } catch (e) {
    if (e instanceof BjRuleError) throw new ApiError(400, 'double_not_allowed', 'Удвоить можно только на первых двух картах');
    throw e;
  }
  const bet = Number(game.bet) + (r.extraBet ? Number(game.bet) : 0);
  const res = await rpc<{ balance: number }>('bj_apply', {
    p_user: user.id,
    p_game: game.id,
    p_version: game.version,
    p_state: r.state,
    p_status: r.finished ? 'finished' : 'active',
    p_outcome: r.outcome,
    p_payout: r.finished && r.outcome ? payoutFor(bet, r.outcome) : 0,
    p_extra_bet: r.extraBet ? Number(game.bet) : 0,
  });
  const fresh = await getGame(user.id, game.id);
  return { game: toClient(fresh!, Number(res.balance)) };
});

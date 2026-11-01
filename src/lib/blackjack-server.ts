import 'server-only';
import { db, check } from '@/lib/supabase/admin';
import { handValue, publicView, type BjState, type BjOutcome } from '@/lib/game/blackjack';

export type BjRow = {
  id: string; user_id: string; bet: number; state: BjState; status: 'active' | 'finished';
  outcome: BjOutcome | null; payout: number | null; version: number; server_seed_hash: string | null;
  client_seed: string | null; nonce: number | null; created_at: string;
};

export async function getActiveGame(userId: string): Promise<BjRow | null> {
  const rows = check(await db().from('blackjack_games').select('*').eq('user_id', userId).eq('status', 'active').limit(1)) as BjRow[];
  return rows[0] ?? null;
}

export async function getGame(userId: string, id: string): Promise<BjRow | null> {
  const rows = check(await db().from('blackjack_games').select('*').eq('id', id).eq('user_id', userId).limit(1)) as BjRow[];
  return rows[0] ?? null;
}

/** Отфильтрованное представление: скрытая карта дилера и колода никогда не уходят клиенту, пока партия идёт. */
export function toClient(g: BjRow, balance?: number) {
  const finished = g.status === 'finished';
  const view = publicView(g.state, finished);
  return {
    id: g.id, bet: Number(g.bet), status: g.status, outcome: g.outcome, payout: g.payout === null ? null : Number(g.payout),
    version: g.version, view, balance,
    fair: { server_seed_hash: g.server_seed_hash, client_seed: g.client_seed, nonce: g.nonce },
    playerTotal: handValue(g.state.player).total,
  };
}

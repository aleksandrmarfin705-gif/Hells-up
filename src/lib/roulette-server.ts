import 'server-only';
import { db, check, rpc } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/errors';
import { generateServerSeed, rouletteResult, sha256Hex } from '@/lib/fair';
import { getSettings, num } from '@/lib/settings';

type Round = {
  id: string; round_no: number; status: 'betting' | 'settled'; server_seed_hash: string;
  starts_at: string; ends_at: string; result: number | null; result_color: string | null;
  revealed_seed: string | null; settled_at: string | null;
};

async function latestRound(): Promise<Round | null> {
  const rows = check(await db().from('roulette_rounds').select('*').order('round_no', { ascending: false }).limit(1)) as Round[];
  return rows[0] ?? null;
}

async function openRound(): Promise<Round> {
  const s = await getSettings();
  const seed = generateServerSeed();
  return rpc<Round>('roulette_open_round', { p_seed: seed, p_hash: sha256Hex(seed), p_seconds: num(s.roulette_round_seconds, 30) });
}

/**
 * «Ленивый» тик: на Vercel нет постоянного процесса, поэтому любой запрос состояния продвигает раунд.
 * Все функции идемпотентны и защищены блокировками PostgreSQL, поэтому одновременные тики безопасны.
 */
export async function tickRoulette(): Promise<Round> {
  let round = await latestRound();
  if (!round || round.status === 'settled') return openRound();
  if (Date.now() >= new Date(round.ends_at).getTime() + 250) {
    const secret = check(await db().from('roulette_round_secrets').select('server_seed').eq('round_id', round.id).limit(1)) as { server_seed: string }[];
    if (secret[0]) {
      try {
        await rpc('roulette_settle', { p_round: round.id, p_result: rouletteResult(secret[0].server_seed, round.id), p_seed: secret[0].server_seed });
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 'round_not_finished')) throw e;
        return round; // часы БД чуть отстают — попробуем при следующем запросе
      }
    }
    round = await openRound();
  }
  return round;
}

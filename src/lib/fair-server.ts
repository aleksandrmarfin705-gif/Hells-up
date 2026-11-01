import 'server-only';
import { rpc } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/errors';
import { generateClientSeed, generateServerSeed, rollFloat, sha256Hex } from '@/lib/fair';

export type Roll = { seedId: string; nonce: number; serverSeed: string; clientSeed: string; serverSeedHash: string };

async function ensureSeed(userId: string) {
  const seed = generateServerSeed();
  return rpc('fair_ensure_seed', {
    p_user: userId,
    p_server_seed: seed,
    p_hash: sha256Hex(seed),
    p_client_seed: generateClientSeed(),
  });
}

/** Берёт следующий nonce активного seed пользователя (создаёт seed при первом обращении). */
export async function takeRoll(userId: string): Promise<Roll> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await rpc<any>('fair_take_nonce', { p_user: userId });
      return {
        seedId: r.seed_id,
        nonce: Number(r.nonce),
        serverSeed: r.server_seed,
        clientSeed: r.client_seed,
        serverSeedHash: r.server_seed_hash,
      };
    } catch (e) {
      if (e instanceof ApiError && e.code === 'seed_missing' && attempt === 0) {
        await ensureSeed(userId);
        continue;
      }
      throw e;
    }
  }
  throw new ApiError(500, 'internal');
}

export const rollOf = (r: Roll, cursor = 0) => rollFloat(r.serverSeed, r.clientSeed, r.nonce, cursor);
export const publicFair = (r: Roll) => ({ server_seed_hash: r.serverSeedHash, client_seed: r.clientSeed, nonce: r.nonce });

export async function rotateSeed(userId: string, clientSeed?: string) {
  const seed = generateServerSeed();
  return rpc<any>('fair_rotate', {
    p_user: userId,
    p_server_seed: seed,
    p_hash: sha256Hex(seed),
    p_client_seed: clientSeed ?? null,
  });
}

export { ensureSeed };

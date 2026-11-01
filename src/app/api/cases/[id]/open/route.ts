import { z } from 'zod';
import { idKey, route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { rpc } from '@/lib/supabase/admin';
import { publicFair, rollOf, takeRoll } from '@/lib/fair-server';

const body = z.object({ key: idKey });

export const POST = route({ body, limit: [40, 60] }, async ({ user, body, params }) => {
  if (!uuid.safeParse(params.id).success) throw new ApiError(404, 'case_not_found', 'Кейс не найден');
  // Результат определяет только сервер: roll = HMAC(server_seed, client_seed:nonce).
  const roll = await takeRoll(user.id);
  const result = await rpc<any>('open_case', {
    p_user: user.id,
    p_case: params.id,
    p_roll: rollOf(roll),
    p_seed_id: roll.seedId,
    p_nonce: roll.nonce,
    p_key: body.key,
  });
  return { ...result, fair: publicFair(roll) };
});

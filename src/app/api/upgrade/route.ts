import { z } from 'zod';
import { idKey, route, uuid } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';
import { publicFair, rollOf, takeRoll } from '@/lib/fair-server';

const body = z.object({ userItemId: uuid, targetItemId: uuid, key: idKey });

export const POST = route({ body, limit: [30, 60] }, async ({ user, body }) => {
  const roll = await takeRoll(user.id);
  const result = await rpc<any>('do_upgrade', {
    p_user: user.id,
    p_user_item: body.userItemId,
    p_target: body.targetItemId,
    p_roll: rollOf(roll),
    p_seed_id: roll.seedId,
    p_nonce: roll.nonce,
    p_key: body.key,
  });
  return { ...result, fair: publicFair(roll) };
});

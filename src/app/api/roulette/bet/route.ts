import { z } from 'zod';
import { idKey, route, uuid } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';
import { BET_TYPES } from '@/lib/game/roulette';

const body = z
  .object({
    roundId: uuid,
    type: z.enum(BET_TYPES as [string, ...string[]]),
    value: z.number().int().min(0).max(36).optional(),
    amount: z.number().int().positive().max(1_000_000_000),
    key: idKey,
  })
  .refine((b) => (b.type === 'number') === (b.value !== undefined), { message: 'Для ставки на число укажите число 0–36' });

export const POST = route({ body, limit: [60, 60] }, async ({ user, body }) =>
  rpc('roulette_place_bet', {
    p_user: user.id, p_round: body.roundId, p_type: body.type, p_value: body.value ?? null,
    p_amount: body.amount, p_key: body.key,
  }),
);

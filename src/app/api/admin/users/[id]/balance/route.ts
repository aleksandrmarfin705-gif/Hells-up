import { z } from 'zod';
import { route, uuid } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';

const body = z.object({
  delta: z.number().int().refine((n) => n !== 0, 'Сумма не может быть нулевой').refine((n) => Math.abs(n) <= 1_000_000_000, 'Слишком большая сумма'),
  reason: z.string().trim().min(3, 'Укажите причину').max(200),
});

export const POST = route({ auth: 'admin', body, limit: [30, 60] }, async ({ user, params, body }) => {
  const id = uuid.parse(params.id);
  return rpc('admin_adjust_balance', {
    p_actor: user.id, p_actor_tg: user.telegram_id, p_target: id, p_delta: body.delta, p_reason: body.reason,
  });
});

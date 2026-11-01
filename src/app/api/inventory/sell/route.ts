import { z } from 'zod';
import { idKey, route, uuid } from '@/lib/api';
import { rpc } from '@/lib/supabase/admin';

const body = z.object({ userItemId: uuid, key: idKey });

export const POST = route({ body, limit: [40, 60] }, async ({ user, body }) =>
  rpc('sell_item', { p_user: user.id, p_user_item: body.userItemId, p_key: body.key }),
);

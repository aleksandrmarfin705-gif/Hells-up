import { z } from 'zod';
import { route } from '@/lib/api';
import { rotateSeed, ensureSeed } from '@/lib/fair-server';

const body = z.object({ clientSeed: z.string().trim().min(1).max(64).regex(/^[\w-]+$/, 'Только буквы, цифры, _ и -').optional() });

/** Раскрывает текущий server seed и создаёт новый (опционально — с новым client seed). */
export const POST = route({ body, limit: [10, 60] }, async ({ user, body }) => {
  await ensureSeed(user.id);
  return rotateSeed(user.id, body.clientSeed);
});

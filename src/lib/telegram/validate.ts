import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const tgUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().max(256).optional(),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.string().url().max(512).optional(),
  language_code: z.string().max(16).optional(),
  is_bot: z.boolean().optional(),
});
export type TelegramUser = z.infer<typeof tgUserSchema>;

export class InitDataError extends Error {
  constructor(public code: 'missing_hash' | 'bad_signature' | 'expired' | 'bad_user' | 'future') {
    super(code);
  }
}

/**
 * Проверка Telegram Mini App initData (HMAC-SHA256):
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 3600,
  nowMs = Date.now(),
): { user: TelegramUser; authDate: number; startParam?: string } {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) throw new InitDataError('missing_hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new InitDataError('bad_signature');

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) throw new InitDataError('expired');
  const age = Math.floor(nowMs / 1000) - authDate;
  if (age > maxAgeSec) throw new InitDataError('expired');
  if (age < -60) throw new InitDataError('future');

  let userJson: unknown;
  try {
    userJson = JSON.parse(params.get('user') ?? '');
  } catch {
    throw new InitDataError('bad_user');
  }
  const parsed = tgUserSchema.safeParse(userJson);
  if (!parsed.success || parsed.data.is_bot) throw new InitDataError('bad_user');
  return { user: parsed.data, authDate, startParam: params.get('start_param') ?? undefined };
}

/** Только для тестов: подписывает initData так же, как Telegram. */
export function signInitDataForTests(fields: Record<string, string>, botToken: string): string {
  const dcs = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(dcs).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

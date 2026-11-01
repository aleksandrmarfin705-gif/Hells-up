import { describe, it, expect } from 'vitest';
import { validateInitData, signInitDataForTests, InitDataError } from '@/lib/telegram/validate';

const TOKEN = '123456:TEST_TOKEN_not_real_but_long_enough_xxxxx';
const user = JSON.stringify({ id: 4242, first_name: 'Ann', username: 'ann' });
const now = 1_800_000_000;
const make = (over: Record<string, string> = {}) =>
  signInitDataForTests({ auth_date: String(now), query_id: 'AAH', user, ...over }, TOKEN);

describe('validateInitData', () => {
  it('принимает корректную подпись', () => {
    const r = validateInitData(make(), TOKEN, 3600, now * 1000);
    expect(r.user.id).toBe(4242);
    expect(r.user.username).toBe('ann');
  });

  it('отклоняет подпись с другим токеном бота', () => {
    expect(() => validateInitData(make(), TOKEN + 'x', 3600, now * 1000)).toThrow(InitDataError);
  });

  it('отклоняет подделанные поля (смена user.id)', () => {
    const forged = make().replace(encodeURIComponent('"id":4242'), encodeURIComponent('"id":1'));
    expect(forged).not.toBe(make());
    expect(() => validateInitData(forged, TOKEN, 3600, now * 1000)).toThrow(/bad_signature/);
  });

  it('отклоняет отсутствие hash и мусорный hash', () => {
    expect(() => validateInitData('user=%7B%7D&auth_date=1', TOKEN)).toThrow(/missing_hash/);
    expect(() => validateInitData('hash=zzzz&auth_date=1', TOKEN)).toThrow(/missing_hash/);
  });

  it('отклоняет устаревшие данные и данные из будущего', () => {
    expect(() => validateInitData(make(), TOKEN, 3600, (now + 3601) * 1000)).toThrow(/expired/);
    expect(() => validateInitData(make(), TOKEN, 3600, (now - 120) * 1000)).toThrow(/future/);
    expect(() => validateInitData(make(), TOKEN, 3600, (now + 3599) * 1000)).not.toThrow();
  });

  it('отклоняет ботов и некорректного пользователя', () => {
    const bot = signInitDataForTests({ auth_date: String(now), user: JSON.stringify({ id: 1, is_bot: true }) }, TOKEN);
    expect(() => validateInitData(bot, TOKEN, 3600, now * 1000)).toThrow(/bad_user/);
    const bad = signInitDataForTests({ auth_date: String(now), user: 'not json' }, TOKEN);
    expect(() => validateInitData(bad, TOKEN, 3600, now * 1000)).toThrow(/bad_user/);
  });
});

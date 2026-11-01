export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** Коды ошибок PostgreSQL-функций → HTTP-статус и понятное сообщение. */
const DB_ERRORS: Record<string, [number, string]> = {
  insufficient_balance: [400, 'Недостаточно монет'],
  user_not_found: [404, 'Пользователь не найден'],
  user_banned: [403, 'Аккаунт заблокирован'],
  feature_disabled: [403, 'Этот режим временно отключён'],
  case_not_found: [404, 'Кейс не найден или отключён'],
  case_empty: [409, 'В кейсе нет предметов'],
  item_not_found: [404, 'Предмет не найден'],
  invalid_target: [400, 'Нельзя улучшить до этого предмета'],
  chance_too_low: [400, 'Шанс слишком мал — выберите цель поближе по цене'],
  invalid_roll: [500, 'Ошибка генератора'],
  topup_cooldown: [429, 'Демо-пополнение пока недоступно — подождите'],
  round_not_found: [404, 'Раунд не найден'],
  round_closed: [409, 'Приём ставок закрыт'],
  round_not_finished: [409, 'Раунд ещё не завершён'],
  invalid_bet: [400, 'Некорректная ставка'],
  invalid_amount: [400, 'Сумма вне допустимых лимитов'],
  too_many_bets: [400, 'Слишком много ставок в этом раунде'],
  game_in_progress: [409, 'Сначала завершите текущую партию'],
  stale_game: [409, 'Партия уже изменилась — обновите экран'],
  invalid_state: [400, 'Некорректное состояние игры'],
  seed_missing: [409, 'Seed не создан'],
  seed_mismatch: [500, 'Ошибка проверки seed'],
};

export function mapDbError(message: string | undefined): ApiError {
  const code = (message ?? '').trim();
  const hit = DB_ERRORS[code];
  if (hit) return new ApiError(hit[0], code, hit[1]);
  return new ApiError(500, 'db_error', 'Внутренняя ошибка базы данных');
}

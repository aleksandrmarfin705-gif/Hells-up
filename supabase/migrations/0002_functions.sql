-- HELLS UP — серверные RPC-функции.
-- Все игровые и денежные операции выполняются в одной транзакции с блокировкой строки пользователя.
-- Функции доступны ТОЛЬКО service_role (см. 0003_rls.sql); браузер вызвать их не может.
-- Порядок блокировок (во избежание deadlock): раунд рулетки -> пользователь.

-- ───────────── Вспомогательные ─────────────

create or replace function public.app_setting_int(p_key text, p_default bigint)
returns bigint language sql stable as $$
  select coalesce((select (value #>> '{}')::bigint from public.settings where key = p_key), p_default)
$$;

create or replace function public.app_setting_bool(p_key text, p_default boolean)
returns boolean language sql stable as $$
  select coalesce((select (value #>> '{}')::boolean from public.settings where key = p_key), p_default)
$$;

create or replace function public.app_mask_name(p_username text, p_first text)
returns text language sql immutable as $$
  select case
    when coalesce(nullif(p_username, ''), nullif(p_first, '')) is null then 'Игрок***'
    else left(coalesce(nullif(p_username, ''), p_first), 2) || '***'
  end
$$;

-- Блокирует и возвращает пользователя; бросает ошибку, если нет или заблокирован.
create or replace function public.app_lock_user(p_user uuid)
returns public.users language plpgsql as $$
declare u public.users;
begin
  select * into u from public.users where id = p_user for update;
  if not found then raise exception 'user_not_found'; end if;
  if u.is_banned then raise exception 'user_banned'; end if;
  return u;
end $$;

-- Единственный путь изменения баланса: пишет запись в transactions, не допускает отрицательный баланс.
-- Вызывать только после app_lock_user().
create or replace function public.app_change_balance(
  p_user uuid, p_amount bigint, p_type text, p_ref uuid default null, p_meta jsonb default '{}'::jsonb
) returns bigint language plpgsql as $$
declare v_balance bigint;
begin
  select balance into v_balance from public.users where id = p_user;
  if v_balance + p_amount < 0 then raise exception 'insufficient_balance'; end if;
  if p_amount = 0 then return v_balance; end if;
  update public.users set balance = balance + p_amount where id = p_user returning balance into v_balance;
  insert into public.transactions (user_id, type, amount, balance_after, ref_id, meta)
  values (p_user, p_type, p_amount, v_balance, p_ref, coalesce(p_meta, '{}'::jsonb));
  return v_balance;
end $$;

create or replace function public.app_idem_get(p_user uuid, p_key text)
returns jsonb language sql stable as $$
  select result from public.idempotency_keys where user_id = p_user and key = p_key
$$;

create or replace function public.app_idem_put(p_user uuid, p_key text, p_result jsonb)
returns void language sql as $$
  insert into public.idempotency_keys (user_id, key, result) values (p_user, p_key, p_result)
  on conflict do nothing
$$;

create or replace function public.app_event(
  p_kind text, p_name text, p_title text, p_rarity text, p_amount bigint
) returns void language sql as $$
  insert into public.game_events (kind, display_name, title, rarity, amount)
  values (p_kind, p_name, p_title, p_rarity, p_amount)
$$;

create or replace function public.app_rarity_rank(p_rarity text)
returns int language sql immutable as $$
  select case p_rarity
    when 'common' then 0 when 'uncommon' then 1 when 'rare' then 2
    when 'epic' then 3 when 'legendary' then 4 when 'mythic' then 5 else 0 end
$$;

-- ───────────── Пользователи ─────────────

create or replace function public.app_upsert_telegram_user(
  p_tg bigint, p_username text, p_first text, p_last text, p_photo text, p_lang text
) returns jsonb language plpgsql as $$
declare u public.users; v_start bigint;
begin
  select * into u from public.users where telegram_id = p_tg;
  if not found then
    insert into public.users (telegram_id, username, first_name, last_name, photo_url, language_code)
    values (p_tg, p_username, p_first, p_last, p_photo, p_lang)
    on conflict (telegram_id) do nothing
    returning * into u;
    if found then
      v_start := public.app_setting_int('start_balance', 5000);
      if v_start > 0 then
        perform public.app_lock_user(u.id);
        perform public.app_change_balance(u.id, v_start, 'welcome', null, '{"note":"стартовый демо-баланс"}');
      end if;
    end if;
  else
    update public.users
       set username = p_username, first_name = p_first, last_name = p_last,
           photo_url = p_photo, language_code = p_lang, last_seen_at = now()
     where id = u.id;
  end if;
  select * into u from public.users where telegram_id = p_tg;
  return to_jsonb(u);
end $$;

create or replace function public.claim_topup(p_user uuid)
returns jsonb language plpgsql as $$
declare u public.users; v_amount bigint; v_cd bigint; v_bal bigint;
begin
  u := public.app_lock_user(p_user);
  v_amount := public.app_setting_int('topup_amount', 1000);
  v_cd := public.app_setting_int('topup_cooldown_seconds', 3600);
  if v_amount <= 0 then raise exception 'feature_disabled'; end if;
  if u.last_topup_at is not null and u.last_topup_at + make_interval(secs => v_cd) > now() then
    raise exception 'topup_cooldown';
  end if;
  v_bal := public.app_change_balance(p_user, v_amount, 'topup', null, '{"note":"демо-пополнение"}');
  update public.users set last_topup_at = now() where id = p_user;
  return jsonb_build_object('balance', v_bal, 'amount', v_amount,
                            'next_at', now() + make_interval(secs => v_cd));
end $$;

-- ───────────── Provably fair ─────────────

create or replace function public.fair_ensure_seed(p_user uuid, p_server_seed text, p_hash text, p_client_seed text)
returns jsonb language plpgsql as $$
declare s public.rng_seeds;
begin
  perform public.app_lock_user(p_user);
  select * into s from public.rng_seeds where user_id = p_user and active;
  if not found then
    insert into public.rng_seeds (user_id, server_seed, server_seed_hash, client_seed)
    values (p_user, p_server_seed, p_hash, p_client_seed) returning * into s;
  end if;
  return jsonb_build_object('id', s.id, 'server_seed_hash', s.server_seed_hash,
                            'client_seed', s.client_seed, 'nonce', s.nonce);
end $$;

-- Выдаёт следующий nonce (под блокировкой). Секретный server_seed возвращается только серверу.
create or replace function public.fair_take_nonce(p_user uuid)
returns jsonb language plpgsql as $$
declare s public.rng_seeds;
begin
  perform public.app_lock_user(p_user);
  update public.rng_seeds set nonce = nonce + 1
   where user_id = p_user and active returning * into s;
  if not found then raise exception 'seed_missing'; end if;
  return jsonb_build_object('seed_id', s.id, 'server_seed', s.server_seed,
    'server_seed_hash', s.server_seed_hash, 'client_seed', s.client_seed, 'nonce', s.nonce);
end $$;

-- Ротация: раскрывает старый server_seed и создаёт новый. Запрещена при активной партии блэкджека.
create or replace function public.fair_rotate(p_user uuid, p_server_seed text, p_hash text, p_client_seed text)
returns jsonb language plpgsql as $$
declare old public.rng_seeds; fresh public.rng_seeds; v_client text; v_had boolean;
begin
  perform public.app_lock_user(p_user);
  if exists (select 1 from public.blackjack_games where user_id = p_user and status = 'active') then
    raise exception 'game_in_progress';
  end if;
  select * into old from public.rng_seeds where user_id = p_user and active for update;
  v_had := found;
  v_client := coalesce(p_client_seed, old.client_seed, encode(sha256(convert_to(p_server_seed, 'UTF8')), 'hex'));
  if v_had then
    update public.rng_seeds set active = false, revealed_at = now() where id = old.id;
  end if;
  insert into public.rng_seeds (user_id, server_seed, server_seed_hash, client_seed)
  values (p_user, p_server_seed, p_hash, left(v_client, 64)) returning * into fresh;
  return jsonb_build_object(
    'revealed', case when not v_had then null else jsonb_build_object(
      'id', old.id, 'server_seed', old.server_seed, 'server_seed_hash', old.server_seed_hash,
      'client_seed', old.client_seed, 'last_nonce', old.nonce) end,
    'active', jsonb_build_object('id', fresh.id, 'server_seed_hash', fresh.server_seed_hash,
      'client_seed', fresh.client_seed, 'nonce', fresh.nonce));
end $$;

-- ───────────── Кейсы ─────────────

create or replace function public.open_case(
  p_user uuid, p_case uuid, p_roll double precision, p_seed_id uuid, p_nonce bigint, p_key text
) returns jsonb language plpgsql as $$
declare
  u public.users; c public.cases; r record; v_prev jsonb; v_total bigint; v_target bigint;
  v_acc bigint := 0; v_item uuid; v_odds jsonb := '[]'::jsonb; v_ui uuid := gen_random_uuid();
  v_opening uuid := gen_random_uuid(); v_bal bigint; it public.items; sd public.rng_seeds; v_result jsonb;
begin
  u := public.app_lock_user(p_user);
  v_prev := public.app_idem_get(p_user, p_key);
  if v_prev is not null then return v_prev; end if;
  if p_roll < 0 or p_roll >= 1 then raise exception 'invalid_roll'; end if;
  if not public.app_setting_bool('cases_enabled', true) then raise exception 'feature_disabled'; end if;

  select * into c from public.cases where id = p_case and is_active;
  if not found then raise exception 'case_not_found'; end if;

  select coalesce(sum(ci.weight), 0) into v_total
    from public.case_items ci join public.items i on i.id = ci.item_id and i.is_active
   where ci.case_id = p_case;
  if v_total = 0 then raise exception 'case_empty'; end if;
  v_target := floor(p_roll * v_total);

  for r in
    select ci.item_id, ci.weight from public.case_items ci
      join public.items i on i.id = ci.item_id and i.is_active
     where ci.case_id = p_case order by ci.weight desc, ci.item_id
  loop
    v_odds := v_odds || jsonb_build_object('item_id', r.item_id, 'weight', r.weight);
    if v_item is null then
      v_acc := v_acc + r.weight;
      if v_target < v_acc then v_item := r.item_id; end if;
    end if;
  end loop;

  select * into it from public.items where id = v_item;
  v_bal := public.app_change_balance(p_user, -c.price, 'case_open', v_opening,
             jsonb_build_object('case', c.name, 'item', it.name));
  insert into public.user_items (id, user_id, item_id, source) values (v_ui, p_user, v_item, 'case');
  select * into sd from public.rng_seeds where id = p_seed_id and user_id = p_user;
  insert into public.case_openings (id, user_id, case_id, item_id, user_item_id, price_paid, roll, odds,
                                    seed_id, server_seed_hash, client_seed, nonce)
  values (v_opening, p_user, p_case, v_item, v_ui, c.price, p_roll, v_odds,
          sd.id, sd.server_seed_hash, sd.client_seed, p_nonce);

  if public.app_rarity_rank(it.rarity) >= 2 then
    perform public.app_event('case', public.app_mask_name(u.username, u.first_name),
                             it.name || ' из «' || c.name || '»', it.rarity, it.virtual_price);
  end if;

  v_result := jsonb_build_object('opening_id', v_opening, 'user_item_id', v_ui, 'item', to_jsonb(it),
                                 'balance', v_bal, 'roll', p_roll, 'price_paid', c.price);
  perform public.app_idem_put(p_user, p_key, v_result);
  return v_result;
end $$;

-- ───────────── Инвентарь ─────────────

create or replace function public.sell_item(p_user uuid, p_user_item uuid, p_key text)
returns jsonb language plpgsql as $$
declare ui public.user_items; it public.items; v_prev jsonb; v_bal bigint; v_result jsonb;
begin
  perform public.app_lock_user(p_user);
  v_prev := public.app_idem_get(p_user, p_key);
  if v_prev is not null then return v_prev; end if;
  select * into ui from public.user_items where id = p_user_item and user_id = p_user and status = 'owned' for update;
  if not found then raise exception 'item_not_found'; end if;
  select * into it from public.items where id = ui.item_id;
  update public.user_items set status = 'sold', sold_price = it.virtual_price, closed_at = now() where id = ui.id;
  v_bal := public.app_change_balance(p_user, it.virtual_price, 'item_sell', ui.id, jsonb_build_object('item', it.name));
  v_result := jsonb_build_object('balance', v_bal, 'price', it.virtual_price, 'item', to_jsonb(it));
  perform public.app_idem_put(p_user, p_key, v_result);
  return v_result;
end $$;

-- ───────────── Upgrade ─────────────

-- Шанс успеха в базисных пунктах (10000 = 100%): цена_входа / цена_цели * (1 - edge), не больше максимума.
create or replace function public.upgrade_chance_bp(p_in bigint, p_target bigint)
returns integer language sql stable as $$
  select case when p_in <= 0 or p_target <= 0 then 0 else
    least(public.app_setting_int('upgrade_max_chance_bp', 9500),
          floor(p_in::numeric * 10000 / p_target * (10000 - public.app_setting_int('upgrade_edge_bp', 500)) / 10000))::int
  end
$$;

create or replace function public.do_upgrade(
  p_user uuid, p_user_item uuid, p_target uuid, p_roll double precision,
  p_seed_id uuid, p_nonce bigint, p_key text
) returns jsonb language plpgsql as $$
declare
  u public.users; ui public.user_items; inp public.items; tgt public.items; v_prev jsonb;
  v_chance int; v_success boolean; v_new_ui uuid; v_up uuid := gen_random_uuid();
  sd public.rng_seeds; v_result jsonb;
begin
  u := public.app_lock_user(p_user);
  v_prev := public.app_idem_get(p_user, p_key);
  if v_prev is not null then return v_prev; end if;
  if p_roll < 0 or p_roll >= 1 then raise exception 'invalid_roll'; end if;
  if not public.app_setting_bool('upgrade_enabled', true) then raise exception 'feature_disabled'; end if;

  select * into ui from public.user_items where id = p_user_item and user_id = p_user and status = 'owned' for update;
  if not found then raise exception 'item_not_found'; end if;
  select * into inp from public.items where id = ui.item_id;
  select * into tgt from public.items where id = p_target and is_active;
  if not found then raise exception 'invalid_target'; end if;
  if tgt.virtual_price <= inp.virtual_price then raise exception 'invalid_target'; end if;

  v_chance := public.upgrade_chance_bp(inp.virtual_price, tgt.virtual_price);
  if v_chance < 100 then raise exception 'chance_too_low'; end if;
  v_success := p_roll * 10000 < v_chance;

  update public.user_items set status = 'consumed', closed_at = now() where id = ui.id;
  if v_success then
    v_new_ui := gen_random_uuid();
    insert into public.user_items (id, user_id, item_id, source) values (v_new_ui, p_user, tgt.id, 'upgrade');
    if public.app_rarity_rank(tgt.rarity) >= 2 then
      perform public.app_event('upgrade', public.app_mask_name(u.username, u.first_name),
                               'Улучшение до «' || tgt.name || '»', tgt.rarity, tgt.virtual_price);
    end if;
  end if;
  select * into sd from public.rng_seeds where id = p_seed_id and user_id = p_user;
  insert into public.upgrades (id, user_id, input_item_id, input_user_item_id, target_item_id, input_price,
    target_price, chance_bp, roll, success, seed_id, server_seed_hash, client_seed, nonce)
  values (v_up, p_user, inp.id, ui.id, tgt.id, inp.virtual_price, tgt.virtual_price, v_chance, p_roll,
          v_success, sd.id, sd.server_seed_hash, sd.client_seed, p_nonce);

  v_result := jsonb_build_object('upgrade_id', v_up, 'success', v_success, 'chance_bp', v_chance, 'roll', p_roll,
    'input', to_jsonb(inp), 'target', to_jsonb(tgt), 'user_item_id', v_new_ui);
  perform public.app_idem_put(p_user, p_key, v_result);
  return v_result;
end $$;

-- ───────────── Рулетка (общие раунды) ─────────────

create or replace function public.roulette_color(p_n int)
returns text language sql immutable as $$
  select case when p_n = 0 then 'green'
    when p_n in (1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36) then 'red' else 'black' end
$$;

create or replace function public.roulette_payout(p_type text, p_value int, p_amount bigint, p_result int)
returns bigint language sql immutable as $$
  select case
    when p_type = 'number' and p_result = p_value then p_amount * 36
    when p_result = 0 then 0
    when p_type = 'red'    and public.roulette_color(p_result) = 'red'   then p_amount * 2
    when p_type = 'black'  and public.roulette_color(p_result) = 'black' then p_amount * 2
    when p_type = 'even'   and p_result % 2 = 0 then p_amount * 2
    when p_type = 'odd'    and p_result % 2 = 1 then p_amount * 2
    when p_type = 'low'    and p_result between 1 and 18  then p_amount * 2
    when p_type = 'high'   and p_result between 19 and 36 then p_amount * 2
    when p_type = 'dozen1' and p_result between 1 and 12  then p_amount * 3
    when p_type = 'dozen2' and p_result between 13 and 24 then p_amount * 3
    when p_type = 'dozen3' and p_result between 25 and 36 then p_amount * 3
    else 0 end
$$;

create or replace function public.roulette_open_round(p_seed text, p_hash text, p_seconds int)
returns jsonb language plpgsql as $$
declare r public.roulette_rounds;
begin
  perform pg_advisory_xact_lock(7001);
  select * into r from public.roulette_rounds where status = 'betting';
  if not found then
    insert into public.roulette_rounds (server_seed_hash, ends_at)
    values (p_hash, now() + make_interval(secs => greatest(10, least(p_seconds, 300)))) returning * into r;
    insert into public.roulette_round_secrets (round_id, server_seed) values (r.id, p_seed);
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.roulette_place_bet(
  p_user uuid, p_round uuid, p_type text, p_value int, p_amount bigint, p_key text
) returns jsonb language plpgsql as $$
declare
  r public.roulette_rounds; u public.users; v_prev jsonb; v_min bigint; v_max bigint;
  v_bet uuid := gen_random_uuid(); v_bal bigint; v_count int; v_result jsonb;
begin
  -- сначала раунд (общая блокировка), потом пользователь — тот же порядок, что в roulette_settle
  select * into r from public.roulette_rounds where id = p_round for share;
  if not found then raise exception 'round_not_found'; end if;
  u := public.app_lock_user(p_user);
  v_prev := public.app_idem_get(p_user, p_key);
  if v_prev is not null then return v_prev; end if;
  if not public.app_setting_bool('roulette_enabled', true) then raise exception 'feature_disabled'; end if;
  if r.status <> 'betting' or now() >= r.ends_at then raise exception 'round_closed'; end if;
  if (p_type = 'number') <> (p_value is not null) then raise exception 'invalid_bet'; end if;
  v_min := public.app_setting_int('roulette_min_bet', 10);
  v_max := public.app_setting_int('roulette_max_bet', 50000);
  if p_amount < v_min or p_amount > v_max then raise exception 'invalid_amount'; end if;
  select count(*) into v_count from public.roulette_bets where round_id = p_round and user_id = p_user;
  if v_count >= 12 then raise exception 'too_many_bets'; end if;

  v_bal := public.app_change_balance(p_user, -p_amount, 'roulette_bet', v_bet,
             jsonb_build_object('round', r.round_no, 'bet', p_type));
  insert into public.roulette_bets (id, round_id, user_id, display_name, bet_type, bet_value, amount)
  values (v_bet, p_round, p_user, public.app_mask_name(u.username, u.first_name), p_type, p_value, p_amount);
  v_result := jsonb_build_object('bet_id', v_bet, 'balance', v_bal);
  perform public.app_idem_put(p_user, p_key, v_result);
  return v_result;
end $$;

create or replace function public.roulette_settle(p_round uuid, p_result int, p_seed text)
returns jsonb language plpgsql as $$
declare r public.roulette_rounds; b record; w record; v_total bigint := 0;
begin
  select * into r from public.roulette_rounds where id = p_round for update;
  if not found then raise exception 'round_not_found'; end if;
  if r.status = 'settled' then return jsonb_build_object('already', true, 'round', to_jsonb(r)); end if;
  if now() < r.ends_at then raise exception 'round_not_finished'; end if;
  if p_result < 0 or p_result > 36 then raise exception 'invalid_result'; end if;
  if encode(sha256(convert_to(p_seed, 'UTF8')), 'hex') <> r.server_seed_hash then raise exception 'seed_mismatch'; end if;

  for b in select * from public.roulette_bets where round_id = p_round loop
    update public.roulette_bets
       set payout = public.roulette_payout(b.bet_type, b.bet_value, b.amount, p_result)
     where id = b.id;
  end loop;

  for w in
    select user_id, sum(payout)::bigint as total, max(display_name) as name, sum(amount)::bigint as staked
      from public.roulette_bets where round_id = p_round group by user_id order by user_id
  loop
    if w.total > 0 then
      perform 1 from public.users where id = w.user_id for update;
      perform public.app_change_balance(w.user_id, w.total, 'roulette_win', p_round,
                jsonb_build_object('round', r.round_no, 'result', p_result));
      if w.total > w.staked and w.total >= 1000 then
        perform public.app_event('roulette', w.name, 'Выигрыш в рулетке · раунд №' || r.round_no, null, w.total);
      end if;
      v_total := v_total + w.total;
    end if;
  end loop;

  update public.roulette_rounds
     set status = 'settled', result = p_result, result_color = public.roulette_color(p_result),
         revealed_seed = p_seed, settled_at = now()
   where id = p_round returning * into r;
  delete from public.roulette_round_secrets where round_id = p_round;
  return jsonb_build_object('already', false, 'round', to_jsonb(r), 'paid_out', v_total);
end $$;

-- ───────────── Blackjack ─────────────

create or replace function public.bj_start(
  p_user uuid, p_bet bigint, p_state jsonb, p_status text, p_outcome text, p_payout bigint,
  p_seed_id uuid, p_nonce bigint, p_key text
) returns jsonb language plpgsql as $$
declare u public.users; v_prev jsonb; v_game uuid := gen_random_uuid(); v_bal bigint; sd public.rng_seeds; v_result jsonb;
begin
  u := public.app_lock_user(p_user);
  v_prev := public.app_idem_get(p_user, p_key);
  if v_prev is not null then return v_prev; end if;
  if not public.app_setting_bool('blackjack_enabled', true) then raise exception 'feature_disabled'; end if;
  if p_bet < public.app_setting_int('blackjack_min_bet', 10) or p_bet > public.app_setting_int('blackjack_max_bet', 50000) then
    raise exception 'invalid_amount';
  end if;
  if p_status not in ('active','finished') or coalesce(p_payout, 0) > p_bet * 3 then raise exception 'invalid_state'; end if;
  if exists (select 1 from public.blackjack_games where user_id = p_user and status = 'active') then
    raise exception 'game_in_progress';
  end if;
  select * into sd from public.rng_seeds where id = p_seed_id and user_id = p_user;

  v_bal := public.app_change_balance(p_user, -p_bet, 'blackjack_bet', v_game, '{}'::jsonb);
  insert into public.blackjack_games (id, user_id, bet, state, status, outcome, payout, seed_id, server_seed_hash,
                                      client_seed, nonce, finished_at)
  values (v_game, p_user, p_bet, p_state, p_status, p_outcome, case when p_status = 'finished' then p_payout end,
          sd.id, sd.server_seed_hash, sd.client_seed, p_nonce, case when p_status = 'finished' then now() end);
  if p_status = 'finished' and p_payout > 0 then
    v_bal := public.app_change_balance(p_user, p_payout, 'blackjack_win', v_game, jsonb_build_object('outcome', p_outcome));
    if p_payout > p_bet and p_payout >= 1000 then
      perform public.app_event('blackjack', public.app_mask_name(u.username, u.first_name), 'Победа в Blackjack', null, p_payout);
    end if;
  end if;
  v_result := jsonb_build_object('game_id', v_game, 'balance', v_bal);
  perform public.app_idem_put(p_user, p_key, v_result);
  return v_result;
end $$;

create or replace function public.bj_apply(
  p_user uuid, p_game uuid, p_version int, p_state jsonb, p_status text, p_outcome text,
  p_payout bigint, p_extra_bet bigint
) returns jsonb language plpgsql as $$
declare u public.users; g public.blackjack_games; v_bal bigint; v_new_bet bigint;
begin
  u := public.app_lock_user(p_user);
  select * into g from public.blackjack_games
   where id = p_game and user_id = p_user and status = 'active' and version = p_version for update;
  if not found then raise exception 'stale_game'; end if;
  if p_extra_bet < 0 or p_extra_bet > g.bet then raise exception 'invalid_amount'; end if;
  v_new_bet := g.bet + p_extra_bet;
  if p_status not in ('active','finished') or coalesce(p_payout, 0) > v_new_bet * 3 then raise exception 'invalid_state'; end if;
  if p_extra_bet > 0 then
    perform public.app_change_balance(p_user, -p_extra_bet, 'blackjack_bet', g.id, '{"double":true}'::jsonb);
  end if;
  update public.blackjack_games
     set state = p_state, bet = v_new_bet, version = version + 1, status = p_status, outcome = p_outcome,
         payout = case when p_status = 'finished' then p_payout end,
         finished_at = case when p_status = 'finished' then now() end
   where id = g.id;
  if p_status = 'finished' and p_payout > 0 then
    perform public.app_change_balance(p_user, p_payout, 'blackjack_win', g.id, jsonb_build_object('outcome', p_outcome));
    if p_payout > v_new_bet and p_payout >= 1000 then
      perform public.app_event('blackjack', public.app_mask_name(u.username, u.first_name), 'Победа в Blackjack', null, p_payout);
    end if;
  end if;
  select balance into v_bal from public.users where id = p_user;
  return jsonb_build_object('game_id', g.id, 'balance', v_bal);
end $$;

-- ───────────── Статистика и админ ─────────────

create or replace function public.user_stats(p_user uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'cases_opened',  (select count(*) from public.case_openings where user_id = p_user),
    'items_owned',   (select count(*) from public.user_items where user_id = p_user and status = 'owned'),
    'inventory_value', (select coalesce(sum(i.virtual_price), 0) from public.user_items ui
                          join public.items i on i.id = ui.item_id where ui.user_id = p_user and ui.status = 'owned'),
    'upgrades_total', (select count(*) from public.upgrades where user_id = p_user),
    'upgrades_won',   (select count(*) from public.upgrades where user_id = p_user and success),
    'roulette_bets',  (select count(*) from public.roulette_bets where user_id = p_user),
    'roulette_wins',  (select count(*) from public.roulette_bets where user_id = p_user and payout > 0),
    'blackjack_games', (select count(*) from public.blackjack_games where user_id = p_user and status = 'finished'),
    'blackjack_wins',  (select count(*) from public.blackjack_games where user_id = p_user and outcome in ('win','blackjack')),
    'total_spent',   (select coalesce(-sum(amount), 0) from public.transactions
                        where user_id = p_user and type in ('case_open','roulette_bet','blackjack_bet')),
    'total_won',     (select coalesce(sum(amount), 0) from public.transactions
                        where user_id = p_user and type in ('roulette_win','blackjack_win','item_sell'))
  )
$$;

create or replace function public.admin_stats()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'users_total',   (select count(*) from public.users),
    'users_active_24h', (select count(*) from public.users where last_seen_at > now() - interval '24 hours'),
    'users_banned',  (select count(*) from public.users where is_banned),
    'case_openings', (select count(*) from public.case_openings),
    'upgrades',      (select count(*) from public.upgrades),
    'roulette_bets', (select count(*) from public.roulette_bets),
    'roulette_rounds', (select count(*) from public.roulette_rounds where status = 'settled'),
    'blackjack_games', (select count(*) from public.blackjack_games),
    'game_operations', (select count(*) from public.case_openings) + (select count(*) from public.upgrades)
                       + (select count(*) from public.roulette_bets) + (select count(*) from public.blackjack_games),
    'balance_total', (select coalesce(sum(balance), 0) from public.users),
    'inventory_value_total', (select coalesce(sum(i.virtual_price), 0) from public.user_items ui
                                join public.items i on i.id = ui.item_id where ui.status = 'owned'),
    'coins_spent_cases', (select coalesce(sum(price_paid), 0) from public.case_openings),
    'open_support_threads', (select count(*) from public.support_threads where status = 'open')
  )
$$;

create or replace function public.admin_adjust_balance(
  p_actor uuid, p_actor_tg bigint, p_target uuid, p_delta bigint, p_reason text
) returns jsonb language plpgsql as $$
declare u public.users; v_before bigint; v_bal bigint;
begin
  if p_delta = 0 then raise exception 'invalid_amount'; end if;
  select * into u from public.users where id = p_target for update;
  if not found then raise exception 'user_not_found'; end if;
  v_before := u.balance;
  v_bal := public.app_change_balance(p_target, p_delta, 'admin_adjust', null,
             jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)));
  insert into public.audit_log (actor_user_id, actor_telegram_id, action, target_type, target_id, diff)
  values (p_actor, p_actor_tg, 'user.balance_adjust', 'user', p_target::text,
          jsonb_build_object('before', v_before, 'after', v_bal, 'delta', p_delta, 'reason', left(coalesce(p_reason, ''), 200)));
  return jsonb_build_object('balance', v_bal);
end $$;

-- Очистка устаревших ключей идемпотентности (можно вызывать вручную / по расписанию).
create or replace function public.cleanup_idempotency(p_older_than interval default interval '7 days')
returns bigint language plpgsql as $$
declare n bigint;
begin
  delete from public.idempotency_keys where created_at < now() - p_older_than;
  get diagnostics n = row_count;
  return n;
end $$;

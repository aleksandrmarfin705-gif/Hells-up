-- HELLS UP — схема БД (демо-экономика, только виртуальные монеты).
-- Баланс целочисленный, отрицательным быть не может, все изменения идут через журнал transactions.

create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.users (
  id            uuid primary key default gen_random_uuid(),
  telegram_id   bigint not null unique,
  username      text,
  first_name    text,
  last_name     text,
  photo_url     text,
  language_code text,
  balance       bigint not null default 0 check (balance >= 0),
  is_banned     boolean not null default false,
  ban_reason    text,
  last_topup_at timestamptz,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index users_username_idx on public.users (lower(username));
create index users_last_seen_idx on public.users (last_seen_at desc);

create table public.items (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,
  name          text not null check (char_length(name) between 1 and 80),
  description   text not null default '' check (char_length(description) <= 500),
  rarity        text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  art           text not null default 'gem',
  image_url     text,
  virtual_price bigint not null check (virtual_price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index items_price_idx on public.items (virtual_price);

create table public.cases (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,
  name        text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  price       bigint not null check (price >= 0),
  accent      text not null default '#d4af37',
  art         text not null default 'chest',
  image_url   text,
  is_active   boolean not null default true,
  is_featured boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.case_items (
  case_id uuid not null references public.cases (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete restrict,
  weight  integer not null check (weight > 0),
  primary key (case_id, item_id)
);
create index case_items_item_idx on public.case_items (item_id);

create table public.user_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  item_id    uuid not null references public.items (id) on delete restrict,
  status     text not null default 'owned' check (status in ('owned','sold','consumed')),
  source     text not null check (source in ('case','upgrade','admin','bonus')),
  sold_price bigint,
  acquired_at timestamptz not null default now(),
  closed_at  timestamptz
);
create index user_items_user_status_idx on public.user_items (user_id, status, acquired_at desc);

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  type          text not null check (type in (
    'welcome','topup','case_open','item_sell','roulette_bet','roulette_win',
    'blackjack_bet','blackjack_win','admin_adjust')),
  amount        bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  ref_id        uuid,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, created_at desc);

-- Защита от повторных запросов: результат первой обработки возвращается при повторе с тем же ключом.
create table public.idempotency_keys (
  user_id    uuid not null references public.users (id) on delete cascade,
  key        text not null check (char_length(key) between 8 and 80),
  result     jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index idempotency_created_idx on public.idempotency_keys (created_at);

-- Provably fair: server_seed секретен, пока не раскрыт (revealed_at).
create table public.rng_seeds (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  server_seed      text not null,
  server_seed_hash text not null,
  client_seed      text not null,
  nonce            bigint not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  revealed_at      timestamptz
);
create unique index rng_seeds_one_active_idx on public.rng_seeds (user_id) where active;
create index rng_seeds_user_idx on public.rng_seeds (user_id, created_at desc);

create table public.case_openings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  case_id          uuid not null references public.cases (id) on delete restrict,
  item_id          uuid not null references public.items (id) on delete restrict,
  user_item_id     uuid not null references public.user_items (id) on delete restrict,
  price_paid       bigint not null check (price_paid >= 0),
  roll             double precision not null check (roll >= 0 and roll < 1),
  odds             jsonb not null,           -- снимок шансов: [{item_id, weight}] в порядке выбора
  seed_id          uuid references public.rng_seeds (id),
  server_seed_hash text,
  client_seed      text,
  nonce            bigint,
  created_at       timestamptz not null default now()
);
create index case_openings_user_idx on public.case_openings (user_id, created_at desc);
create index case_openings_created_idx on public.case_openings (created_at desc);

create table public.upgrades (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  input_item_id    uuid not null references public.items (id) on delete restrict,
  input_user_item_id uuid not null references public.user_items (id) on delete restrict,
  target_item_id   uuid not null references public.items (id) on delete restrict,
  input_price      bigint not null,
  target_price     bigint not null,
  chance_bp        integer not null check (chance_bp between 1 and 10000),
  roll             double precision not null check (roll >= 0 and roll < 1),
  success          boolean not null,
  seed_id          uuid references public.rng_seeds (id),
  server_seed_hash text,
  client_seed      text,
  nonce            bigint,
  created_at       timestamptz not null default now()
);
create index upgrades_user_idx on public.upgrades (user_id, created_at desc);

create table public.roulette_rounds (
  id               uuid primary key default gen_random_uuid(),
  round_no         bigint generated always as identity,
  status           text not null default 'betting' check (status in ('betting','settled')),
  server_seed_hash text not null,
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz not null,
  result           integer check (result between 0 and 36),
  result_color     text check (result_color in ('red','black','green')),
  revealed_seed    text,            -- раскрывается только после settled
  settled_at       timestamptz
);
create index roulette_rounds_no_idx on public.roulette_rounds (round_no desc);
create unique index roulette_one_betting_idx on public.roulette_rounds ((true)) where status = 'betting';

-- Секрет раунда хранится отдельно: к таблице нет ни одной политики RLS.
create table public.roulette_round_secrets (
  round_id    uuid primary key references public.roulette_rounds (id) on delete cascade,
  server_seed text not null
);

create table public.roulette_bets (
  id           uuid primary key default gen_random_uuid(),
  round_id     uuid not null references public.roulette_rounds (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  display_name text not null,
  bet_type     text not null check (bet_type in
    ('red','black','even','odd','low','high','dozen1','dozen2','dozen3','number')),
  bet_value    integer check (bet_value between 0 and 36),
  amount       bigint not null check (amount > 0),
  payout       bigint check (payout >= 0),
  created_at   timestamptz not null default now(),
  check ((bet_type = 'number') = (bet_value is not null))
);
create index roulette_bets_round_idx on public.roulette_bets (round_id);
create index roulette_bets_user_idx on public.roulette_bets (user_id, created_at desc);

create table public.blackjack_games (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  bet              bigint not null check (bet > 0),
  state            jsonb not null,       -- колода и руки; наружу отдаётся только отфильтрованное представление
  status           text not null default 'active' check (status in ('active','finished')),
  outcome          text check (outcome in ('win','lose','push','blackjack')),
  payout           bigint check (payout >= 0),
  version          integer not null default 0,
  seed_id          uuid references public.rng_seeds (id),
  server_seed_hash text,
  client_seed      text,
  nonce            bigint,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);
create unique index blackjack_one_active_idx on public.blackjack_games (user_id) where status = 'active';
create index blackjack_user_idx on public.blackjack_games (user_id, created_at desc);

create table public.support_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  subject         text not null check (char_length(subject) between 1 and 120),
  status          text not null default 'open' check (status in ('open','closed')),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index support_threads_user_idx on public.support_threads (user_id, last_message_at desc);
create index support_threads_status_idx on public.support_threads (status, last_message_at desc);

create table public.support_messages (
  id        uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  sender    text not null check (sender in ('user','admin')),
  author_id uuid references public.users (id) on delete set null,
  body      text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_messages_thread_idx on public.support_messages (thread_id, created_at);

create table public.audit_log (
  id                bigint generated always as identity primary key,
  actor_user_id     uuid references public.users (id) on delete set null,
  actor_telegram_id bigint,
  action            text not null,
  target_type       text,
  target_id         text,
  diff              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Лента событий для главной (реальные и помеченные is_demo демонстрационные).
create table public.game_events (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('case','upgrade','roulette','blackjack')),
  display_name text not null,
  title        text not null,
  rarity       text check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  amount       bigint,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index game_events_created_idx on public.game_events (created_at desc);

-- Настройки по умолчанию.
insert into public.settings (key, value) values
  ('app_name',               '"HELLS UP"'),
  ('start_balance',          '5000'),
  ('topup_amount',           '1000'),
  ('topup_cooldown_seconds', '3600'),
  ('maintenance',            'false'),
  ('maintenance_message',    '"Ведутся технические работы. Скоро вернёмся."'),
  ('upgrade_edge_bp',        '500'),
  ('upgrade_max_chance_bp',  '9500'),
  ('roulette_enabled',       'true'),
  ('roulette_round_seconds', '30'),
  ('roulette_min_bet',       '10'),
  ('roulette_max_bet',       '50000'),
  ('blackjack_enabled',      'true'),
  ('blackjack_min_bet',      '10'),
  ('blackjack_max_bet',      '50000'),
  ('cases_enabled',          'true'),
  ('upgrade_enabled',        'true'),
  ('banner_title',           '"Поднимись из пепла"'),
  ('banner_subtitle',        '"Открывай кейсы, улучшай предметы, играй в демо-режимах. Только виртуальные монеты."'),
  ('show_demo_events',       'true');

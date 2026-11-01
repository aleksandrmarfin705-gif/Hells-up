-- HELLS UP — права доступа и RLS.
-- Принцип: клиент (anon / authenticated) НЕ имеет прямого доступа к данным, кроме явно перечисленных
-- публичных таблиц для Realtime. Вся остальная работа идёт через сервер (service_role), который
-- сам проверяет сессию Telegram-пользователя.

alter table public.settings               enable row level security;
alter table public.users                  enable row level security;
alter table public.items                  enable row level security;
alter table public.cases                  enable row level security;
alter table public.case_items             enable row level security;
alter table public.user_items             enable row level security;
alter table public.transactions           enable row level security;
alter table public.idempotency_keys       enable row level security;
alter table public.rng_seeds              enable row level security;
alter table public.case_openings          enable row level security;
alter table public.upgrades               enable row level security;
alter table public.roulette_rounds        enable row level security;
alter table public.roulette_round_secrets enable row level security;
alter table public.roulette_bets          enable row level security;
alter table public.blackjack_games        enable row level security;
alter table public.support_threads        enable row level security;
alter table public.support_messages       enable row level security;
alter table public.audit_log              enable row level security;
alter table public.game_events            enable row level security;

-- Снимаем все права у клиентских ролей, затем выдаём минимально необходимые.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Публичные данные для Realtime (в них нет секретов: имена замаскированы, seed раскрывается после раунда).
grant select on public.roulette_rounds to anon, authenticated;
grant select on public.roulette_bets   to anon, authenticated;
grant select on public.game_events     to anon, authenticated;
create policy roulette_rounds_public_read on public.roulette_rounds for select to anon, authenticated using (true);
create policy roulette_bets_public_read   on public.roulette_bets   for select to anon, authenticated using (true);
create policy game_events_public_read     on public.game_events     for select to anon, authenticated using (true);

-- Чат поддержки: читать может только владелец (sub в JWT, который выдаёт наш сервер) .
grant select on public.support_threads  to authenticated;
grant select on public.support_messages to authenticated;
-- Токен выдаёт только наш сервер (подпись JWT-секретом проекта); claim app_role=admin получают лишь ADMIN_TELEGRAM_IDS.
create policy support_threads_owner_read on public.support_threads for select to authenticated
  using (user_id = nullif(auth.jwt() ->> 'sub', '')::uuid or (auth.jwt() ->> 'app_role') = 'admin');
create policy support_messages_owner_read on public.support_messages for select to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin' or exists (select 1 from public.support_threads t
                  where t.id = thread_id and t.user_id = nullif(auth.jwt() ->> 'sub', '')::uuid));

-- Функции: только service_role.
grant execute on all functions in schema public to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Realtime: публикуем только то, что безопасно (Supabase создаёт публикацию supabase_realtime).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.roulette_rounds;
    alter publication supabase_realtime add table public.roulette_bets;
    alter publication supabase_realtime add table public.game_events;
    alter publication supabase_realtime add table public.support_messages;
  end if;
end $$;

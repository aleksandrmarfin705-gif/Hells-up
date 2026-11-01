-- HELLS UP — демонстрационный контент (вымышленные предметы, только виртуальная экономика).
-- Скрипт идемпотентен: повторный запуск не дублирует данные и не затирает цены, изменённые в админке.

insert into public.items (slug, name, description, rarity, art, virtual_price) values
  ('dark-coin',        'Тёмная монета',        'Потускневшая монета из забытой казны.',             'common',    'coin',   15),
  ('rusty-dagger',     'Ржавый кинжал',        'Служил многим хозяевам и ни одному — верно.',       'common',    'blade',  25),
  ('bone-charm',       'Костяной талисман',    'Оберег, шепчущий по ночам.',                        'common',    'skull',  30),
  ('dull-ring',        'Тусклое кольцо',       'Когда-то оно блестело.',                            'common',    'ring',   40),
  ('ash-vial',         'Пепельный флакон',     'Пепел, собранный на месте старого костра.',         'common',    'potion', 50),
  ('iron-key',         'Железный ключ',        'Подходит к двери, которой больше нет.',             'common',    'key',    60),
  ('charred-shield',   'Обугленный щит',       'Хранит следы всех битв.',                           'common',    'shield', 80),
  ('shadow-blade',     'Клинок тени',          'Отбрасывает тень, которой нет у владельца.',        'uncommon',  'blade',  150),
  ('amber-shard',      'Янтарный осколок',     'Внутри застыл крошечный огонь.',                    'uncommon',  'gem',    180),
  ('ash-ring',         'Кольцо золы',          'Тёплое на ощупь даже зимой.',                       'uncommon',  'ring',   220),
  ('heat-elixir',      'Эликсир жара',         'Один глоток — и ночь коротка.',                     'uncommon',  'potion', 260),
  ('abyss-seal',       'Печать бездны',        'Печать, которую лучше не ломать.',                  'uncommon',  'orb',    300),
  ('silver-skull',     'Серебряный череп',     'Улыбается шире, чем положено.',                     'uncommon',  'skull',  350),
  ('crimson-ruby',     'Багровый рубин',       'Цвета последнего заката.',                          'rare',      'gem',    600),
  ('guardian-shield',  'Щит стража',           'Ещё не пропустил ни одного удара.',                 'rare',      'shield', 750),
  ('flame-key',        'Пламенный ключ',       'Открывает любые двери, оставляя гарь.',             'rare',      'key',    900),
  ('coal-sphere',      'Сфера угля',           'Внутри — пульс спящего вулкана.',                   'rare',      'orb',    1100),
  ('executioner-blade','Клинок палача',        'Тяжёлый, как приговор.',                            'rare',      'blade',  1300),
  ('dark-signet',      'Перстень тьмы',        'Носить его — значит быть замеченным.',              'rare',      'ring',   1600),
  ('ash-crown',        'Корона пепла',         'Корона тех, кто встал после падения.',              'epic',      'crown',  2800),
  ('volcano-heart',    'Сердце вулкана',       'Бьётся раз в сто лет.',                             'epic',      'gem',    3500),
  ('flame-claw',       'Коготь пламени',       'Оставляет след, который не гаснет.',                'epic',      'flame',  4200),
  ('night-aegis',      'Эгида ночи',           'Щит, сотканный из темноты.',                        'epic',      'shield', 5000),
  ('curse-seal',       'Печать проклятия',     'Тот, кто ею владеет, не бывает один.',              'epic',      'orb',    6000),
  ('king-skull',       'Череп короля',         'Корона к нему так и не вернулась.',                 'epic',      'skull',  7500),
  ('golden-crown',     'Золотая корона',       'Тяжёлая, как обещание.',                            'legendary', 'crown',  12000),
  ('dawn-blade',       'Клинок рассвета',      'Режет ночь на две половины.',                       'legendary', 'blade',  16000),
  ('bottomless-heart', 'Бездонное сердце',     'Сколько ни отдавай — не пустеет.',                  'legendary', 'gem',    20000),
  ('flame-throne',     'Трон пламени',         'Садиться — только своим.',                          'legendary', 'crown',  26000),
  ('underworld-key',   'Ключ преисподней',     'Один оборот — и всё меняется.',                     'legendary', 'key',    32000),
  ('lord-ring',        'Кольцо владыки',       'Кольцо, перед которым опускают взгляд.',            'legendary', 'ring',   40000),
  ('hells-up-crown',   'Корона HELLS UP',      'Символ тех, кто поднялся выше всех.',               'mythic',    'crown',  75000),
  ('hell-heart',       'Сердце ада',           'Горит без топлива и без конца.',                    'mythic',    'flame',  100000),
  ('abyss-eye',        'Око бездны',           'Смотрит на тебя в ответ.',                          'mythic',    'orb',    150000),
  ('eternity-blade',   'Клинок вечности',      'Его история длиннее истории мира.',                 'mythic',    'blade',  250000)
on conflict (slug) do nothing;

insert into public.cases (slug, name, description, price, accent, art, is_featured, sort_order) values
  ('ash',        'Пепел',        'Простые находки для знакомства с игрой.',            0, '#9a8f7d', 'chest',  false, 1),
  ('embers',     'Угли',         'Ещё тлеет: попадаются настоящие редкости.',          0, '#e0782b', 'flame',  true,  2),
  ('shadow',     'Тень',         'Тёмный кейс с клинками и печатями.',                 0, '#8f7bd6', 'relic',  false, 3),
  ('crimson',    'Багрянец',     'Рубины, щиты и перстни цвета заката.',               0, '#d1344a', 'chest',  true,  4),
  ('obsidian',   'Обсидиан',     'Эпические трофеи из чёрного стекла.',                0, '#4fb6c7', 'relic',  false, 5),
  ('crown',      'Корона',       'Короны и легендарные клинки для смелых.',            0, '#e8c55a', 'crown',  true,  6),
  ('underworld', 'Преисподняя',  'Редкие артефакты глубин. Высокий риск.',             0, '#e2552b', 'flame',  false, 7),
  ('lord',       'Владыка',      'Вершина коллекции: легендарные и мифические трофеи.',0, '#f5d77a', 'crown',  true,  8)
on conflict (slug) do nothing;

-- Состав кейсов: диапазон цен предметов. Шанс ∝ 1 / цена — дорогие предметы выпадают реже.
with bands(case_slug, lo, hi) as (values
  ('ash', 15, 150), ('embers', 25, 350), ('shadow', 60, 900), ('crimson', 150, 1600),
  ('obsidian', 600, 5000), ('crown', 1300, 12000), ('underworld', 3500, 40000), ('lord', 12000, 250000))
insert into public.case_items (case_id, item_id, weight)
select c.id, i.id, greatest(1, round(1000000000.0 / i.virtual_price))::int
  from bands b
  join public.cases c on c.slug = b.case_slug
  join public.items i on i.virtual_price between b.lo and b.hi
on conflict (case_id, item_id) do nothing;

-- Цена кейса = ожидаемая стоимость выпадения / 0.94 (возврат ≈ 94%, «издержки» ≈ 6%).
with ev as (
  select ci.case_id, sum(i.virtual_price::numeric * ci.weight) / sum(ci.weight) as ev
    from public.case_items ci join public.items i on i.id = ci.item_id group by ci.case_id)
update public.cases c
   set price = greatest(10, round(ev.ev / 0.94, -greatest(0, floor(log(ev.ev / 0.94))::int - 1)))::bigint
  from ev
 where ev.case_id = c.id and c.price = 0;

-- Демонстрационные события для ленты (помечены is_demo, в интерфейсе отображаются как демо).
insert into public.game_events (kind, display_name, title, rarity, amount, is_demo, created_at)
select * from (values
  ('case',      'Ma***', 'Клинок рассвета из «Корона»',        'legendary', 16000, true, now() - interval '3 minutes'),
  ('upgrade',   'Al***', 'Улучшение до «Эгида ночи»',          'epic',      5000,  true, now() - interval '7 minutes'),
  ('roulette',  'Ni***', 'Выигрыш в рулетке · число 17',       null,        18000, true, now() - interval '11 minutes'),
  ('case',      'Ed***', 'Багровый рубин из «Багрянец»',       'rare',      600,   true, now() - interval '16 minutes'),
  ('blackjack', 'Vi***', 'Blackjack — 3:2',                    null,        7500,  true, now() - interval '22 minutes'),
  ('case',      'Ko***', 'Сердце вулкана из «Обсидиан»',       'epic',      3500,  true, now() - interval '31 minutes'),
  ('upgrade',   'Re***', 'Улучшение до «Перстень тьмы»',       'rare',      1600,  true, now() - interval '44 minutes'),
  ('case',      'Za***', 'Корона HELLS UP из «Владыка»',       'mythic',    75000, true, now() - interval '58 minutes')
) as t(kind, display_name, title, rarity, amount, is_demo, created_at)
where not exists (select 1 from public.game_events where is_demo);

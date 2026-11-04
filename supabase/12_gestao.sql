-- =============================================================
-- Minha Rotina — etapa 12: área de gestão (números do app)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Precisa das etapas 1 a 11 já rodadas.)
--
-- DEPOIS DE RODAR, faça você mesma administradora com UMA linha
-- (troque pelo e-mail com que você entra no app):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com'
--   on conflict do nothing;
-- =============================================================

-- Quem pode ver a área de gestão. Sem regras de acesso: ninguém lê
-- esta tabela pelo app; só as funções abaixo consultam.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- Dias em que cada pessoa abriu o app (um registro por dia, sem horário
-- e sem o que ela fez). Serve para contar pessoas ativas.
create table if not exists public.user_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day     date not null default current_date,
  primary key (user_id, day)
);
alter table public.user_days enable row level security;
drop policy if exists "Cada usuaria registra o proprio dia" on public.user_days;
create policy "Cada usuaria registra o proprio dia" on public.user_days
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Cada usuaria ve os proprios dias" on public.user_days;
create policy "Cada usuaria ve os proprios dias" on public.user_days
  for select to authenticated using ((select auth.uid()) = user_id);
grant select, insert on public.user_days to authenticated;

-- Sou administradora?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Números do app. Só totais: não devolve o conteúdo de nada que as
-- pessoas cadastraram (nem compromissos, nem dados de saúde).
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  areas  jsonb := '[]'::jsonb;
  t      record;
  n_users int;
  n_people int;
  n_items bigint;
begin
  if not public.is_admin() then
    raise exception 'acesso_negado';
  end if;

  -- Quantas pessoas usam cada área (pelo menos 1 registro) e quantos registros
  for t in
    select * from (values
      ('Agenda', 'activities'), ('Lembretes', 'reminders'), ('Lista de compras', 'shopping_items'),
      ('Outras listas', 'lists'), ('Aniversários', 'birthdays'), ('Remédios', 'medications'),
      ('Filhos', 'children'), ('Ciclo', 'menstrual_cycles'), ('Exercícios', 'workouts'),
      ('Filmes e séries', 'watchlist'), ('Compartilhou algo', 'shares')
    ) as v(label, tbl)
  loop
    if to_regclass('public.' || t.tbl) is null then
      continue;
    end if;
    execute format(
      'select count(distinct %s), count(*) from public.%I',
      case when t.tbl = 'shares' then 'owner_id' else 'user_id' end, t.tbl
    ) into n_people, n_items;
    areas := areas || jsonb_build_object('area', t.label, 'people', n_people, 'items', n_items);
  end loop;

  select count(*) into n_users from auth.users;

  select jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total',      n_users,
      'confirmed',  (select count(*) from auth.users where email_confirmed_at is not null),
      'new_7d',     (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'new_30d',    (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'active_1d',  (select count(distinct user_id) from public.user_days where day >= current_date),
      'active_7d',  (select count(distinct user_id) from public.user_days where day >= current_date - 6),
      'active_30d', (select count(distinct user_id) from public.user_days where day >= current_date - 29),
      'onboarded',  (select count(*) from auth.users where raw_user_meta_data ? 'onboarded_at'),
      'push',       (select count(distinct user_id) from public.push_subscriptions)
    ),
    -- últimos 30 dias: cadastros e pessoas que abriram o app, por dia
    'days', (
      select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'signups', (select count(*) from auth.users u where u.created_at::date = d::date),
        'active',  (select count(distinct ud.user_id) from public.user_days ud where ud.day = d::date)
      ) order by d)
      from generate_series(current_date - 29, current_date, interval '1 day') as d
    ),
    'areas', areas,
    'palettes', (
      select coalesce(jsonb_object_agg(p, c), '{}'::jsonb) from (
        select coalesce(raw_user_meta_data ->> 'palette', 'rosa') as p, count(*) as c
        from auth.users group by 1
      ) x
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Lista de cadastradas: só o necessário para gestão (nome, e-mail,
-- datas e quantos registros criou). Nada do conteúdo.
create or replace function public.admin_users()
returns table (
  name text, email text, created_at timestamptz, last_seen date, confirmed boolean, items bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'acesso_negado';
  end if;
  return query
    select
      split_part(coalesce(u.raw_user_meta_data ->> 'name', ''), ' ', 1),
      u.email::text,
      u.created_at,
      (select max(ud.day) from public.user_days ud where ud.user_id = u.id),
      u.email_confirmed_at is not null,
      (select count(*) from public.activities a where a.user_id = u.id)
        + (select count(*) from public.reminders r where r.user_id = u.id)
        + (select count(*) from public.shopping_items s where s.user_id = u.id)
    from auth.users u
    order by u.created_at desc
    limit 500;
end;
$$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

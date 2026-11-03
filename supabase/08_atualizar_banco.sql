-- =============================================================
-- Minha Rotina — ATUALIZAÇÃO DO BANCO (etapas 5 e 6 juntas)
-- Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez: não apaga nenhum dado.
-- =============================================================

-- =============================================================
-- Minha Rotina — etapa 5: atividades recorrentes, várias listas,
-- quantidade nos itens e histórico de compras.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Precisa das etapas 2 a 4 já rodadas.)
-- =============================================================

-- ---------- Atividades recorrentes ----------
-- Dias da semana em que repete: 0 = domingo ... 6 = sábado (vazio = não repete)
alter table public.activities add column if not exists repeat_days smallint[];
-- Dias (AAAA-MM-DD) em que uma atividade recorrente foi marcada como feita
alter table public.activities add column if not exists completed_dates date[] not null default '{}';

-- ---------- Outras listas (farmácia, viagem, presentes...) ----------
create table if not exists public.lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  temporary  boolean not null default false,
  created_at timestamptz not null default now()
);

-- Itens: sem lista = lista de compras; com lista = lista personalizada
alter table public.shopping_items add column if not exists list_id  uuid references public.lists (id) on delete cascade;
alter table public.shopping_items add column if not exists quantity text;

-- ---------- Histórico: dias em que a pessoa fez as compras ----------
create table if not exists public.shopping_trips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  done_at    date not null default current_date,
  items      jsonb not null default '[]',   -- [{ "name": "Arroz", "quantity": "5 kg" }, ...]
  created_at timestamptz not null default now()
);

create index if not exists shopping_trips_user_idx on public.shopping_trips (user_id, done_at desc);

-- ---------- Segurança: cada pessoa só vê os próprios dados ----------
alter table public.lists          enable row level security;
alter table public.shopping_trips enable row level security;

drop policy if exists "Cada usuaria cuida das proprias listas" on public.lists;
create policy "Cada usuaria cuida das proprias listas" on public.lists
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Cada usuaria cuida das proprias compras" on public.shopping_trips;
create policy "Cada usuaria cuida das proprias compras" on public.shopping_trips
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.lists          to authenticated;
grant select, insert, update, delete on public.shopping_trips to authenticated;


-- =============================================================
-- Minha Rotina — etapa 6: avisos com o app fechado, remédios,
-- perfil dos filhos, diário do ciclo e privacidade (apagar conta).
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Precisa das etapas 2 a 5 já rodadas.)
-- =============================================================

-- ---------- Extensões para rodar tarefas a cada minuto ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------- Configuração interna (só o servidor lê) ----------
-- Guarda as chaves das notificações e o segredo do agendamento.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;   -- sem regras = ninguém do app lê
insert into public.app_config (key, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- ---------- Aparelhos que recebem notificação ----------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  timezone   text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Cada usuaria cuida dos proprios aparelhos" on public.push_subscriptions;
create policy "Cada usuaria cuida dos proprios aparelhos" on public.push_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Avisos já enviados (para não mandar o mesmo aviso duas vezes)
create table if not exists public.push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_log enable row level security;     -- só o servidor usa

-- ---------- Perfil dos filhos ----------
create table if not exists public.children (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name               text not null,
  birth_date         date,
  school             text,
  school_grade       text,
  pediatrician       text,
  pediatrician_phone text,
  allergies          text,
  clothing_size      text,
  shoe_size          text,
  diaper_size        text,
  notes              text,
  created_at         timestamptz not null default now()
);
alter table public.children enable row level security;
drop policy if exists "Cada usuaria cuida dos proprios filhos" on public.children;
create policy "Cada usuaria cuida dos proprios filhos" on public.children
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.children to authenticated;

-- Compromisso pode ser "para" um dos filhos
alter table public.activities add column if not exists child_id uuid references public.children (id) on delete set null;

-- ---------- Remédios ----------
create table if not exists public.medications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  child_id   uuid references public.children (id) on delete set null,
  name       text not null,
  dose       text,
  times      text[] not null default '{}',          -- horários do dia: {"08:00","20:00"}
  start_date date not null default current_date,
  end_date   date,                                  -- vazio = uso contínuo
  reminder   boolean not null default true,
  notes      text,
  created_at timestamptz not null default now()
);
alter table public.medications enable row level security;
drop policy if exists "Cada usuaria cuida dos proprios remedios" on public.medications;
create policy "Cada usuaria cuida dos proprios remedios" on public.medications
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.medications to authenticated;

-- Doses tomadas
create table if not exists public.medication_doses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  day           date not null,
  time          text not null,
  taken_at      timestamptz not null default now(),
  unique (medication_id, day, time)
);
alter table public.medication_doses enable row level security;
drop policy if exists "Cada usuaria cuida das proprias doses" on public.medication_doses;
create policy "Cada usuaria cuida das proprias doses" on public.medication_doses
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.medication_doses to authenticated;

-- ---------- Diário do ciclo (fluxo, sintomas, humor) ----------
create table if not exists public.cycle_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day        date not null,
  flow       text,                                  -- leve, médio, intenso
  symptoms   text[] not null default '{}',
  mood       text,
  notes      text,
  unique (user_id, day)
);
alter table public.cycle_days enable row level security;
drop policy if exists "Cada usuaria cuida do proprio diario" on public.cycle_days;
create policy "Cada usuaria cuida do proprio diario" on public.cycle_days
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.cycle_days to authenticated;

-- ---------- Privacidade: a própria pessoa apaga a conta ----------
-- Apaga o usuário e, em cascata, todos os dados dele (todas as tabelas
-- usam "on delete cascade").
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Filmes e séries ----------
create table if not exists public.watchlist (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null,
  kind           text not null default 'filme' check (kind in ('filme', 'serie')),
  where_to_watch text,
  status         text not null default 'quero' check (status in ('quero', 'assistindo', 'assisti')),
  rating         smallint check (rating between 1 and 5),
  review         text,
  watched_at     date,
  created_at     timestamptz not null default now()
);
alter table public.watchlist enable row level security;
drop policy if exists "Cada usuaria cuida da propria lista de filmes" on public.watchlist;
create policy "Cada usuaria cuida da propria lista de filmes" on public.watchlist
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.watchlist to authenticated;

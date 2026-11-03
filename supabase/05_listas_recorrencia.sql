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

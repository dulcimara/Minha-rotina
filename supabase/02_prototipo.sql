-- =============================================================
-- Minha Rotina — etapa 2 (protótipo): compras, aniversários e
-- "avisar X minutos antes".
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- =============================================================

-- Quantos minutos antes a pessoa quer ser avisada (0 = na hora)
alter table public.activities
  add column if not exists reminder_minutes_before integer;

-- ---------- Lista de compras ----------
create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  checked    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_user_idx on public.shopping_items (user_id, created_at);

-- ---------- Aniversários (repetem todo ano) ----------
create table if not exists public.birthdays (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  day        smallint not null check (day between 1 and 31),
  month      smallint not null check (month between 1 and 12),
  birth_year smallint,
  created_at timestamptz not null default now()
);

create index if not exists birthdays_user_idx on public.birthdays (user_id, month, day);

-- ---------- Segurança: cada pessoa só vê os próprios dados ----------
alter table public.shopping_items enable row level security;
alter table public.birthdays      enable row level security;

drop policy if exists "Cada usuaria cuida da propria lista" on public.shopping_items;
create policy "Cada usuaria cuida da propria lista"
  on public.shopping_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Cada usuaria cuida dos proprios aniversarios" on public.birthdays;
create policy "Cada usuaria cuida dos proprios aniversarios"
  on public.birthdays for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.shopping_items to authenticated;
grant select, insert, update, delete on public.birthdays      to authenticated;

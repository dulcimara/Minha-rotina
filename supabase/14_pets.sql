-- =============================================================
-- Minha Rotina — etapa 14: pets (cadastro, vacinas e cio)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- =============================================================

-- ---------- Pets ----------
create table if not exists public.pets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  species     text not null default 'cachorro',
  sex         text,
  birth_date  date,
  neutered    boolean,
  neutered_on date,
  breed       text,
  weight_kg   numeric(5, 2),
  notes       text,
  created_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pets_species_check') then
    alter table public.pets
      add constraint pets_species_check check (species in ('cachorro', 'gato', 'outro'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pets_sex_check') then
    alter table public.pets
      add constraint pets_sex_check check (sex in ('macho', 'femea', 'nao_sei'));
  end if;
end $$;

alter table public.pets enable row level security;
drop policy if exists "Cada usuaria cuida dos proprios pets" on public.pets;
create policy "Cada usuaria cuida dos proprios pets" on public.pets
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.pets to authenticated;

-- ---------- Vacinas do pet ----------
create table if not exists public.pet_vaccines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id      uuid not null references public.pets (id) on delete cascade,
  vaccine     text not null,
  dose_date   date not null,
  next_date   date,
  batch       text,
  created_at  timestamptz not null default now()
);
alter table public.pet_vaccines enable row level security;
drop policy if exists "Cada usuaria cuida das vacinas dos proprios pets" on public.pet_vaccines;
create policy "Cada usuaria cuida das vacinas dos proprios pets" on public.pet_vaccines
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.pet_vaccines to authenticated;

-- ---------- Registros de cio (só fêmeas) ----------
create table if not exists public.pet_heats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id      uuid not null references public.pets (id) on delete cascade,
  start_date  date not null,
  end_date    date,
  notes       text,
  created_at  timestamptz not null default now()
);
alter table public.pet_heats enable row level security;
drop policy if exists "Cada usuaria cuida dos cios dos proprios pets" on public.pet_heats;
create policy "Cada usuaria cuida dos cios dos proprios pets" on public.pet_heats
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.pet_heats to authenticated;

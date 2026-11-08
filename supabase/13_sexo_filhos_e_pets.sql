-- Etapa 13: sexo nos filhos (feminino/masculino) e cadastro de pets.
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez sem problema.

-- ---------- Filhos: sexo ----------
alter table public.children add column if not exists sex text
  check (sex in ('feminino', 'masculino'));

-- ---------- Pets ----------
create table if not exists public.pets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  species     text,
  sex         text check (sex in ('feminino', 'masculino')),
  breed       text,
  birth_date  date,
  vet         text,
  vet_phone   text,
  allergies   text,
  notes       text,
  created_at  timestamptz not null default now()
);
alter table public.pets enable row level security;
drop policy if exists "Cada usuaria cuida dos proprios pets" on public.pets;
create policy "Cada usuaria cuida dos proprios pets" on public.pets
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.pets to authenticated;

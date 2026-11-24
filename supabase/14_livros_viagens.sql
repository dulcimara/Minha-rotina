-- =============================================================
-- Minha Rotina — etapa 14: livros e viagens
-- Livros: nome, autor e resumo.
-- Viagens: ida, volta, origem, destino, número da reserva e companhia
-- de ida e de volta. Viagens com data de volta passada aparecem em "Anteriores".
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Precisa das etapas 1 a 13 já rodadas.)
-- =============================================================

-- Livros
create table if not exists public.livros (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null,
  autor       text,
  resumo      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.livros enable row level security;
drop policy if exists "Cada usuaria cuida da propria lista de livros" on public.livros;
create policy "Cada usuaria cuida da propria lista de livros" on public.livros
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.livros to authenticated;

-- Viagens
create table if not exists public.viagens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data_ida        date not null,
  data_volta      date,
  origem          text not null,
  destino         text not null,
  numero_reserva  text,
  cia_ida         text,
  cia_volta       text,
  created_at      timestamptz not null default now(),
  constraint viagens_datas_ok check (data_volta is null or data_volta >= data_ida)
);
alter table public.viagens enable row level security;
drop policy if exists "Cada usuaria cuida das proprias viagens" on public.viagens;
create policy "Cada usuaria cuida das proprias viagens" on public.viagens
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.viagens to authenticated;

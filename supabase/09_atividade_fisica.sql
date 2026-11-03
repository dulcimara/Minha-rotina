-- =============================================================
-- Minha Rotina — etapa 9: atividade física
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- =============================================================

create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity     text not null,                       -- Caminhada, Corrida, Pilates...
  day          date not null default current_date,
  duration_min integer check (duration_min between 1 and 1440),
  distance_km  numeric(6, 2) check (distance_km >= 0),
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists workouts_user_day on public.workouts (user_id, day desc);
alter table public.workouts enable row level security;
drop policy if exists "Cada usuaria cuida das proprias atividades fisicas" on public.workouts;
create policy "Cada usuaria cuida das proprias atividades fisicas" on public.workouts
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.workouts to authenticated;

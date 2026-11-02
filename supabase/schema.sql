-- =============================================================
-- Minha Rotina — estrutura do banco no Supabase
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema.
-- =============================================================

-- ---------- Atividades ----------
create table if not exists public.activities (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title                 text not null,
  description           text,
  date                  timestamptz not null,
  category              text not null,
  completed             boolean not null default false,
  reminder_enabled      boolean not null default false,
  reminder_type         text not null default 'text' check (reminder_type in ('text', 'voice')),
  reminder_date_time    timestamptz,
  reminder_voice_text   text,
  reminder_voice_gender text check (reminder_voice_gender in ('male', 'female')),
  created_at            timestamptz not null default now()
);

create index if not exists activities_user_date_idx on public.activities (user_id, date);

-- ---------- Lembretes rápidos ----------
create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists reminders_user_created_idx on public.reminders (user_id, created_at desc);

-- ---------- Ciclo menstrual (para a próxima etapa do app) ----------
create table if not exists public.menstrual_cycles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null,
  end_date   date,
  notes      text,
  created_at timestamptz not null default now()
);

-- =============================================================
-- Segurança: cada pessoa só enxerga e altera os PRÓPRIOS dados
-- =============================================================
alter table public.activities       enable row level security;
alter table public.reminders        enable row level security;
alter table public.menstrual_cycles enable row level security;

drop policy if exists "Cada usuaria cuida das proprias atividades" on public.activities;
create policy "Cada usuaria cuida das proprias atividades"
  on public.activities for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Cada usuaria cuida dos proprios lembretes" on public.reminders;
create policy "Cada usuaria cuida dos proprios lembretes"
  on public.reminders for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Cada usuaria cuida dos proprios ciclos" on public.menstrual_cycles;
create policy "Cada usuaria cuida dos proprios ciclos"
  on public.menstrual_cycles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Libera o acesso pelo app apenas para quem está logada
grant select, insert, update, delete on public.activities       to authenticated;
grant select, insert, update, delete on public.reminders        to authenticated;
grant select, insert, update, delete on public.menstrual_cycles to authenticated;

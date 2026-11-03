-- =============================================================
-- Minha Rotina — etapa 10: lembretes (data, hora, repetição)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Aproveita a tabela "reminders" criada na etapa 1.)
-- =============================================================

alter table public.reminders add column if not exists emoji     text;
alter table public.reminders add column if not exists due_date  date;
alter table public.reminders add column if not exists due_time  text not null default '09:00';
alter table public.reminders add column if not exists repeat    text not null default 'nao';
alter table public.reminders add column if not exists alert     boolean not null default true;
alter table public.reminders add column if not exists notes     text;
alter table public.reminders add column if not exists done_at   timestamptz;

alter table public.reminders drop constraint if exists reminders_repeat_check;
alter table public.reminders add constraint reminders_repeat_check
  check (repeat in ('nao', 'dia', 'semana', 'mes', 'semestre', 'ano'));

create index if not exists reminders_user_due_idx on public.reminders (user_id, due_date);

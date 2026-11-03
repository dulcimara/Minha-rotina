-- =============================================================
-- Minha Rotina — etapa 4: ideias de presente nos aniversários
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- =============================================================

alter table public.birthdays add column if not exists gift_ideas text;

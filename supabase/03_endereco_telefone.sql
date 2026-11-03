-- =============================================================
-- Minha Rotina — etapa 3: endereço e telefone nos compromissos
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- =============================================================

alter table public.activities add column if not exists address text;
alter table public.activities add column if not exists phone   text;

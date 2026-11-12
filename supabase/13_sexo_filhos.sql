-- =============================================================
-- Minha Rotina — etapa 13: sexo do filho(a) (escolhe o ícone)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Precisa da etapa 6 já rodada, que cria a tabela "children".)
-- =============================================================

alter table public.children add column if not exists sex text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'children_sex_check') then
    alter table public.children
      add constraint children_sex_check check (sex in ('masculino', 'feminino'));
  end if;
end $$;

-- =============================================================
-- Minha Rotina — etapa 13: lembrete com frase falada
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar mais de uma vez sem problema. Não apaga nenhum dado.
-- (Precisa da etapa 10, lembretes com data e hora, já rodada.)
-- =============================================================

-- Frase que o app lê em voz alta na hora do lembrete (vazio = aviso padrão)
alter table public.reminders add column if not exists voice_text   text;
-- Voz escolhida para a frase: feminina ou masculina
alter table public.reminders add column if not exists voice_gender text;

alter table public.reminders drop constraint if exists reminders_voice_gender_check;
alter table public.reminders add constraint reminders_voice_gender_check
  check (voice_gender is null or voice_gender in ('female', 'male'));

-- Frase com tamanho razoável (evita textos gigantes)
alter table public.reminders drop constraint if exists reminders_voice_text_len;
alter table public.reminders add constraint reminders_voice_text_len
  check (voice_text is null or char_length(voice_text) <= 300);

-- Atualiza o cache do Supabase para o app enxergar as colunas novas na hora
notify pgrst, 'reload schema';

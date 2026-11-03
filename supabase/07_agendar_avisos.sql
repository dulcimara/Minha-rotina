-- =============================================================
-- Minha Rotina — etapa 7: liga o envio de avisos a cada minuto.
-- Rode DEPOIS de publicar a função "enviar-avisos" no Supabase.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =============================================================

select cron.schedule(
  'minha-rotina-avisos',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://sfyiusqcqbwdpidlzafx.supabase.co/functions/v1/enviar-avisos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_config where key = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Para conferir se está rodando (deve aparecer uma linha por minuto):
-- select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;

-- Para desligar o envio de avisos:
-- select cron.unschedule('minha-rotina-avisos');

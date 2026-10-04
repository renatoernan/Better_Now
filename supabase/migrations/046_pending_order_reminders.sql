-- 046_pending_order_reminders.sql
-- Aviso de "aguardando pagamento" só depois de 5 minutos sem confirmação.
--
-- O checkout deixou de mandar esse aviso na hora da compra (o comprador
-- recebia "aguardando" junto da confirmação). A cada minuto o pg_cron chama a
-- função send-pending-order-reminders, que avisa só os pedidos do Mercado Pago
-- que continuam pendentes depois de 5 minutos.
--
-- Pré-requisito, rodado à parte e fora do repositório (o valor é segredo):
--   select vault.create_secret('<SEGREDO>', 'pending_reminders_secret');
-- O mesmo valor vai para a função: supabase secrets set PENDING_REMINDERS_SECRET=<SEGREDO>

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Reagendar sem duplicar
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-pending-order-reminders';

SELECT cron.schedule(
  'send-pending-order-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://waeyfjvwhhnwqregofda.supabase.co/functions/v1/send-pending-order-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pending_reminders_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

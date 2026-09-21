SELECT cron.schedule(
  'process-notification-queue',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://syjoyqybrkmbhcantlmx.supabase.co/functions/v1/process-notification-queue',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
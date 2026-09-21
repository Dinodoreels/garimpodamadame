SELECT cron.schedule(
  'check-scheduled-automations',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://syjoyqybrkmbhcantlmx.supabase.co/functions/v1/check-scheduled-automations',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
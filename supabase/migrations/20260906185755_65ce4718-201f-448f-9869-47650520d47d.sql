create policy "cron_tokens_deny_all" on public.cron_tokens for all to anon, authenticated using (false) with check (false);

drop extension pg_net;
create schema if not exists extensions;
create extension pg_net with schema extensions;

select cron.unschedule('cardtrader-scan-hourly');
select cron.schedule(
  'cardtrader-scan-hourly',
  '23 * * * *',
  $$
  select extensions.http_post(
    url := 'https://tcg-vault-luca.lovable.app/api/public/cron/cardtrader-scan',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select token from public.cron_tokens where name = 'cardtrader-scan')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
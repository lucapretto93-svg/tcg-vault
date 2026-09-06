create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.cron_tokens (
  name text primary key,
  token text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now()
);
alter table public.cron_tokens enable row level security;
revoke all on public.cron_tokens from anon, authenticated;
grant all on public.cron_tokens to service_role;

insert into public.cron_tokens (name) values ('cardtrader-scan')
on conflict (name) do nothing;

select cron.schedule(
  'cardtrader-scan-hourly',
  '23 * * * *',
  $$
  select net.http_post(
    url := 'https://tcg-vault-luca.lovable.app/api/public/cron/cardtrader-scan',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select token from public.cron_tokens where name = 'cardtrader-scan')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
CREATE TABLE public.cardtrader_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  radar_enabled boolean NOT NULL DEFAULT false,
  discount_threshold numeric NOT NULL DEFAULT 35,
  max_price numeric NOT NULL DEFAULT 100,
  allowed_conditions text[] NOT NULL DEFAULT ARRAY['Mint','Near Mint','Slightly Played'],
  languages text[] NOT NULL DEFAULT ARRAY['en','it','jp'],
  eras text[] NOT NULL DEFAULT ARRAY[]::text[],
  alert_deal_score numeric NOT NULL DEFAULT 90,
  alert_discount numeric NOT NULL DEFAULT 45,
  push_enabled boolean NOT NULL DEFAULT false,
  telegram_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  notes text,
  last_scan_at timestamptz,
  last_scan_status text,
  last_scan_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardtrader_settings TO authenticated;
GRANT ALL ON public.cardtrader_settings TO service_role;
ALTER TABLE public.cardtrader_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_settings_all ON public.cardtrader_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER ct_settings_updated BEFORE UPDATE ON public.cardtrader_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cardtrader_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  blueprint_id text,
  expansion_code text,
  card_name text NOT NULL DEFAULT '',
  set_name text,
  card_number text,
  language text,
  condition text,
  foil boolean NOT NULL DEFAULT false,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  shipping_estimate numeric,
  all_in_cost numeric,
  benchmark numeric,
  benchmark_source text,
  discount_pct numeric,
  margin numeric,
  roi numeric,
  liquidity_score numeric,
  quality_score numeric,
  deal_score numeric NOT NULL DEFAULT 0,
  seller_name text,
  seller_country text,
  zero_eligible boolean NOT NULL DEFAULT false,
  url text,
  image_url text,
  status text NOT NULL DEFAULT 'NEW',
  notified_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardtrader_deals TO authenticated;
GRANT ALL ON public.cardtrader_deals TO service_role;
ALTER TABLE public.cardtrader_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_deals_all ON public.cardtrader_deals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX ct_deals_user_score_idx ON public.cardtrader_deals (user_id, deal_score DESC);
CREATE INDEX ct_deals_user_status_idx ON public.cardtrader_deals (user_id, status);

CREATE TABLE public.cardtrader_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  listing_id text,
  blueprint_id text,
  product_id text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  quantity integer NOT NULL DEFAULT 1,
  condition text,
  language text,
  status text NOT NULL DEFAULT 'DRAFT',
  last_error text,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardtrader_listings TO authenticated;
GRANT ALL ON public.cardtrader_listings TO service_role;
ALTER TABLE public.cardtrader_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_listings_all ON public.cardtrader_listings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER ct_listings_updated BEFORE UPDATE ON public.cardtrader_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_subs_all ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
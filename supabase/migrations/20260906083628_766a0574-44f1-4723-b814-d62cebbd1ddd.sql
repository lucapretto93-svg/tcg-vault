ALTER TABLE public.items ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'COLLECTION';
DO $$ BEGIN
  ALTER TABLE public.items ADD CONSTRAINT items_bucket_check CHECK (bucket IN ('COLLECTION','STOCK'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_value numeric NOT NULL DEFAULT 0,
  cost_basis numeric NOT NULL DEFAULT 0,
  profit_loss numeric NOT NULL DEFAULT 0,
  raw_value numeric NOT NULL DEFAULT 0,
  slab_value numeric NOT NULL DEFAULT 0,
  sealed_value numeric NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_snapshots TO authenticated;
GRANT ALL ON public.portfolio_snapshots TO service_role;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY snapshots_select ON public.portfolio_snapshots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY snapshots_insert ON public.portfolio_snapshots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY snapshots_update ON public.portfolio_snapshots FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY snapshots_delete ON public.portfolio_snapshots FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER snapshots_updated BEFORE UPDATE ON public.portfolio_snapshots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.price_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'NONE',
  enabled boolean NOT NULL DEFAULT false,
  notes text,
  last_run_at timestamptz,
  last_run_status text,
  last_run_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_sources TO authenticated;
GRANT ALL ON public.price_sources TO service_role;
ALTER TABLE public.price_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY price_sources_select ON public.price_sources FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY price_sources_insert ON public.price_sources FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY price_sources_update ON public.price_sources FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY price_sources_delete ON public.price_sources FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER price_sources_updated BEFORE UPDATE ON public.price_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_items_bucket ON public.items(bucket);
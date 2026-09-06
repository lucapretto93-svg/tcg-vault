ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS card_state text NOT NULL DEFAULT 'RAW',
  ADD COLUMN IF NOT EXISTS graded_company text,
  ADD COLUMN IF NOT EXISTS graded_grade numeric,
  ADD COLUMN IF NOT EXISTS graded_certificate text;

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_card_state_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_card_state_check CHECK (card_state = ANY (ARRAY['RAW'::text, 'GRADED'::text]));

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_graded_grade_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_graded_grade_check CHECK (graded_grade IS NULL OR (graded_grade >= 1 AND graded_grade <= 10));

ALTER TABLE public.card_images DROP CONSTRAINT IF EXISTS card_images_image_type_check;
ALTER TABLE public.card_images ADD CONSTRAINT card_images_image_type_check CHECK (image_type = ANY (ARRAY['COVER'::text, 'FRONT'::text, 'BACK'::text, 'EXTRA'::text]));

CREATE TABLE IF NOT EXISTS public.investment_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  decision text NOT NULL DEFAULT 'HOLD',
  rationale text,
  buy_it_now_price numeric,
  min_acceptable_price numeric,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investment_decisions_decision_check CHECK (decision = ANY (ARRAY['KEEP'::text, 'SELL'::text, 'HOLD'::text, 'UPGRADE'::text])),
  CONSTRAINT investment_decisions_bin_check CHECK (buy_it_now_price IS NULL OR buy_it_now_price >= 0),
  CONSTRAINT investment_decisions_min_check CHECK (min_acceptable_price IS NULL OR min_acceptable_price >= 0)
);

CREATE INDEX IF NOT EXISTS investment_decisions_item_idx ON public.investment_decisions(item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_decisions TO authenticated;
GRANT ALL ON public.investment_decisions TO service_role;

ALTER TABLE public.investment_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS decisions_select ON public.investment_decisions;
CREATE POLICY decisions_select ON public.investment_decisions FOR SELECT TO authenticated USING (public.item_visible(item_id));

DROP POLICY IF EXISTS decisions_write ON public.investment_decisions;
CREATE POLICY decisions_write ON public.investment_decisions FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));

DROP TRIGGER IF EXISTS decisions_updated ON public.investment_decisions;
CREATE TRIGGER decisions_updated BEFORE UPDATE ON public.investment_decisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
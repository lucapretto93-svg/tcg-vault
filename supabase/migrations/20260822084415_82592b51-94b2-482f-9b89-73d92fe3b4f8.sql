
-- helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('CARD','SEALED')),
  status TEXT NOT NULL DEFAULT 'OWNED' CHECK (status IN ('OWNED','GRADING','LISTED','SOLD')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY items_select ON public.items FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY items_insert ON public.items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY items_update ON public.items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY items_delete ON public.items FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER items_updated BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.item_visible(_item UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.items i WHERE i.id = _item AND (i.user_id = auth.uid() OR i.user_id IS NULL));
$$;
CREATE OR REPLACE FUNCTION public.item_owned(_item UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.items i WHERE i.id = _item AND i.user_id = auth.uid());
$$;

CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL UNIQUE REFERENCES public.items(id) ON DELETE CASCADE,
  pokemon_name TEXT NOT NULL DEFAULT '',
  card_name TEXT NOT NULL DEFAULT '',
  set_name TEXT,
  set_code TEXT,
  card_number TEXT,
  set_total TEXT,
  year INTEGER,
  language TEXT,
  rarity TEXT,
  variant TEXT,
  holo BOOLEAN NOT NULL DEFAULT false,
  reverse_holo BOOLEAN NOT NULL DEFAULT false,
  first_edition BOOLEAN NOT NULL DEFAULT false,
  unlimited BOOLEAN NOT NULL DEFAULT false,
  shadowless BOOLEAN NOT NULL DEFAULT false,
  promo BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY cards_select ON public.cards FOR SELECT TO authenticated USING (public.item_visible(item_id));
CREATE POLICY cards_write ON public.cards FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));
CREATE TRIGGER cards_updated BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sealed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL UNIQUE REFERENCES public.items(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  set_name TEXT,
  language TEXT,
  year INTEGER,
  product_type TEXT NOT NULL DEFAULT 'ALTRO',
  quantity INTEGER NOT NULL DEFAULT 1,
  package_condition TEXT,
  sealed_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sealed_products TO authenticated;
GRANT ALL ON public.sealed_products TO service_role;
ALTER TABLE public.sealed_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY sealed_select ON public.sealed_products FOR SELECT TO authenticated USING (public.item_visible(item_id));
CREATE POLICY sealed_write ON public.sealed_products FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));
CREATE TRIGGER sealed_updated BEFORE UPDATE ON public.sealed_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.card_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  image_type TEXT NOT NULL DEFAULT 'EXTRA' CHECK (image_type IN ('FRONT','BACK','EXTRA')),
  url TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_images TO authenticated;
GRANT ALL ON public.card_images TO service_role;
ALTER TABLE public.card_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY images_select ON public.card_images FOR SELECT TO authenticated USING (public.item_visible(item_id));
CREATE POLICY images_write ON public.card_images FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));

CREATE TABLE public.condition_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  overall_condition TEXT,
  centering_front TEXT,
  centering_back TEXT,
  surface_front TEXT,
  surface_back TEXT,
  edges TEXT,
  corners TEXT,
  whitening TEXT,
  scratches TEXT,
  print_lines TEXT,
  dents TEXT,
  creases TEXT,
  stains TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condition_assessments TO authenticated;
GRANT ALL ON public.condition_assessments TO service_role;
ALTER TABLE public.condition_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY cond_select ON public.condition_assessments FOR SELECT TO authenticated USING (public.item_visible(item_id));
CREATE POLICY cond_write ON public.condition_assessments FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));

CREATE TABLE public.grading_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  grading_company TEXT NOT NULL DEFAULT 'PSA',
  min_grade NUMERIC,
  probable_grade NUMERIC,
  max_grade NUMERIC,
  prob_psa6 NUMERIC NOT NULL DEFAULT 0,
  prob_psa7 NUMERIC NOT NULL DEFAULT 0,
  prob_psa8 NUMERIC NOT NULL DEFAULT 0,
  prob_psa9 NUMERIC NOT NULL DEFAULT 0,
  prob_psa10 NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC,
  recommendation TEXT CHECK (recommendation IN ('GRADA','VALUTA','NON GRADARE')),
  grading_cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_assessments TO authenticated;
GRANT ALL ON public.grading_assessments TO service_role;
ALTER TABLE public.grading_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY grade_select ON public.grading_assessments FOR SELECT TO authenticated USING (public.item_visible(item_id));
CREATE POLICY grade_write ON public.grading_assessments FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));

CREATE TABLE public.market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  price_type TEXT NOT NULL CHECK (price_type IN ('RAW','PSA6','PSA7','PSA8','PSA9','PSA10','SEALED')),
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  source TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX market_prices_item_idx ON public.market_prices(item_id, price_type, observed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_prices TO authenticated;
GRANT ALL ON public.market_prices TO service_role;
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY prices_select ON public.market_prices FOR SELECT TO authenticated USING (public.item_visible(item_id));
CREATE POLICY prices_write ON public.market_prices FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT,
  seller TEXT,
  item_price NUMERIC NOT NULL DEFAULT 0,
  shipping NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,
  taxes NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchases_select ON public.purchases FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY purchases_insert ON public.purchases FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY purchases_update ON public.purchases FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY purchases_delete ON public.purchases FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER purchases_updated BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.purchase_visible(_p UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = _p AND (p.user_id = auth.uid() OR p.user_id IS NULL));
$$;
CREATE OR REPLACE FUNCTION public.purchase_owned(_p UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = _p AND p.user_id = auth.uid());
$$;

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  allocated_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_select ON public.purchase_items FOR SELECT TO authenticated USING (public.purchase_visible(purchase_id));
CREATE POLICY pi_write ON public.purchase_items FOR ALL TO authenticated USING (public.purchase_owned(purchase_id)) WITH CHECK (public.purchase_owned(purchase_id));

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT,
  buyer TEXT,
  gross_revenue NUMERIC NOT NULL DEFAULT 0,
  shipping NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,
  taxes NUMERIC NOT NULL DEFAULT 0,
  net_revenue NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY sales_update ON public.sales FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY sales_delete ON public.sales FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sale_visible(_s UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sales s WHERE s.id = _s AND (s.user_id = auth.uid() OR s.user_id IS NULL));
$$;
CREATE OR REPLACE FUNCTION public.sale_owned(_s UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sales s WHERE s.id = _s AND s.user_id = auth.uid());
$$;

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  allocated_revenue NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY si_select ON public.sale_items FOR SELECT TO authenticated USING (public.sale_visible(sale_id));
CREATE POLICY si_write ON public.sale_items FOR ALL TO authenticated USING (public.sale_owned(sale_id)) WITH CHECK (public.sale_owned(sale_id));

CREATE TABLE public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  analysis_type TEXT NOT NULL DEFAULT 'PLACEHOLDER',
  input JSONB,
  output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analyses TO authenticated;
GRANT ALL ON public.ai_analyses TO service_role;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_select ON public.ai_analyses FOR SELECT TO authenticated USING (public.item_visible(item_id));
CREATE POLICY ai_write ON public.ai_analyses FOR ALL TO authenticated USING (public.item_owned(item_id)) WITH CHECK (public.item_owned(item_id));

-- DEMO DATA (user_id NULL = read-only demo, clearly marked)
INSERT INTO public.items (id, user_id, item_type, status, is_demo, notes) VALUES
 ('11111111-1111-4111-8111-111111111101', NULL, 'CARD', 'OWNED', true, 'DEMO'),
 ('11111111-1111-4111-8111-111111111102', NULL, 'CARD', 'OWNED', true, 'DEMO'),
 ('11111111-1111-4111-8111-111111111103', NULL, 'SEALED', 'OWNED', true, 'DEMO');

INSERT INTO public.cards (item_id, pokemon_name, card_name, set_name, set_code, card_number, set_total, year, language, rarity, variant, holo, first_edition, shadowless, notes) VALUES
 ('11111111-1111-4111-8111-111111111101','Charizard','Charizard','Base Set','BS','4','102',1999,'EN','Holo Rare','Unlimited',true,false,false,'[DEMO] Carta di esempio'),
 ('11111111-1111-4111-8111-111111111102','Pikachu','Pikachu VMAX','Vivid Voltage','SWSH04','188','185',2020,'IT','Rainbow Rare','Secret',true,false,false,'[DEMO] Carta di esempio');

INSERT INTO public.sealed_products (item_id, name, set_name, language, year, product_type, quantity, package_condition, sealed_status, notes) VALUES
 ('11111111-1111-4111-8111-111111111103','Elite Trainer Box Evolving Skies','Evolving Skies','EN',2021,'ETB',1,'Near Mint','Sealed','[DEMO] Prodotto di esempio');

INSERT INTO public.condition_assessments (item_id, overall_condition, centering_front, centering_back, surface_front, surface_back, edges, corners, whitening, scratches, print_lines, dents, creases, stains, notes) VALUES
 ('11111111-1111-4111-8111-111111111101','EX','60/40','55/45','Buona','Buona','Lieve usura','Leggermente smussati','Lieve','Alcuni','No','No','No','No','[DEMO]');

INSERT INTO public.grading_assessments (item_id, grading_company, min_grade, probable_grade, max_grade, prob_psa6, prob_psa7, prob_psa8, prob_psa9, prob_psa10, confidence, recommendation, grading_cost, notes) VALUES
 ('11111111-1111-4111-8111-111111111101','PSA',6,8,9,10,20,40,25,5,70,'VALUTA',35,'[DEMO]');

INSERT INTO public.market_prices (item_id, price_type, value, currency, source, observed_at) VALUES
 ('11111111-1111-4111-8111-111111111101','RAW',300,'EUR','DEMO', now() - interval '60 days'),
 ('11111111-1111-4111-8111-111111111101','RAW',350,'EUR','DEMO', now() - interval '30 days'),
 ('11111111-1111-4111-8111-111111111101','RAW',400,'EUR','DEMO', now()),
 ('11111111-1111-4111-8111-111111111101','PSA6',700,'EUR','DEMO', now()),
 ('11111111-1111-4111-8111-111111111101','PSA7',900,'EUR','DEMO', now()),
 ('11111111-1111-4111-8111-111111111101','PSA8',1400,'EUR','DEMO', now()),
 ('11111111-1111-4111-8111-111111111101','PSA9',2600,'EUR','DEMO', now()),
 ('11111111-1111-4111-8111-111111111101','PSA10',9000,'EUR','DEMO', now()),
 ('11111111-1111-4111-8111-111111111102','RAW',55,'EUR','DEMO', now() - interval '20 days'),
 ('11111111-1111-4111-8111-111111111102','RAW',62,'EUR','DEMO', now()),
 ('11111111-1111-4111-8111-111111111103','SEALED',120,'EUR','DEMO', now() - interval '40 days'),
 ('11111111-1111-4111-8111-111111111103','SEALED',145,'EUR','DEMO', now());

INSERT INTO public.purchases (id, user_id, is_demo, purchase_date, platform, seller, item_price, shipping, fees, taxes, total_cost, notes) VALUES
 ('22222222-2222-4222-8222-222222222201', NULL, true, CURRENT_DATE - 120, 'eBay', 'demo_seller', 250, 10, 5, 0, 265, '[DEMO] Acquisto di esempio'),
 ('22222222-2222-4222-8222-222222222202', NULL, true, CURRENT_DATE - 60, 'Cardmarket', 'demo_shop', 130, 8, 4, 0, 142, '[DEMO] Lotto di esempio');

INSERT INTO public.purchase_items (purchase_id, item_id, allocated_cost) VALUES
 ('22222222-2222-4222-8222-222222222201','11111111-1111-4111-8111-111111111101',265),
 ('22222222-2222-4222-8222-222222222202','11111111-1111-4111-8111-111111111102',42),
 ('22222222-2222-4222-8222-222222222202','11111111-1111-4111-8111-111111111103',100);

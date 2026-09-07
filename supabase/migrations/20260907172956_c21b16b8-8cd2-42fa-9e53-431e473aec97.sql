
-- 1) Normalizzazione set duplicati
UPDATE public.cards SET set_name='EX Ruby & Sapphire', set_code='EX1', set_total='109'
  WHERE set_name ILIKE 'EX Ruby%';
UPDATE public.cards SET set_name='EX Dragon', set_code='EX3', set_total='97'
  WHERE set_name ILIKE 'EX Dragon%';
UPDATE public.cards SET set_name='EX Team Magma vs Team Aqua', set_code='EX4', set_total='95'
  WHERE set_name ILIKE 'EX Team Magma%';
UPDATE public.cards SET set_name='EX Fantasmi di Holon', set_code='EX7', set_total='110'
  WHERE set_name ILIKE 'EX Fantasmi di Holon%';
UPDATE public.cards SET set_name='Neo Genesis', set_code='NEO1', set_total='111'
  WHERE set_name ILIKE 'Neo Genesis%';
UPDATE public.cards SET set_name='Neo Discovery', set_code='NEO2', set_total='75'
  WHERE set_name ILIKE 'Neo Discovery%';
UPDATE public.cards SET set_name='Neo Destiny', set_code='NEO4', set_total='105'
  WHERE set_name ILIKE 'Neo Destiny%';
UPDATE public.cards SET set_name='Base Set', set_code='BS', set_total='102'
  WHERE set_name ILIKE 'Base Set' OR set_name ILIKE 'Set Base';
UPDATE public.cards SET set_name='Base Set 2', set_code='BS2', set_total='130'
  WHERE set_name ILIKE 'Base Set 2%';
UPDATE public.cards SET set_name='Fossil', set_code='FO', set_total='62'
  WHERE set_name ILIKE 'Fossil%';
UPDATE public.cards SET set_name='Team Rocket', set_code='TR', set_total='82'
  WHERE set_name ILIKE 'Team Rocket';
UPDATE public.cards SET set_name='Gym Heroes', set_code='GYM1', set_total='132'
  WHERE set_name ILIKE 'Gym Heroes%';
UPDATE public.cards SET set_name='Gym Challenge', set_code='GYM2', set_total='132'
  WHERE set_name ILIKE 'Gym Challenge%';
UPDATE public.cards SET set_name='Legendary Collection', set_code='LC', set_total='110'
  WHERE set_name ILIKE 'Legendary Collection%';
UPDATE public.cards SET set_name='Aquapolis', set_code='AQ', set_total='147'
  WHERE set_name ILIKE 'Aquapolis%';
UPDATE public.cards SET set_name='Tesori Misteriosi', set_code='DP2', set_total='123'
  WHERE set_name ILIKE 'Tesori Misteriosi%';
UPDATE public.cards SET set_name='Glory of Team Rocket', set_code='SV10', set_total='098'
  WHERE set_name ILIKE '%Glory of Team Rocket%';
UPDATE public.cards SET set_name='Dark Phantasma', set_code='s10a', set_total='071'
  WHERE set_name ILIKE 'Dark Phantasma%';
UPDATE public.cards SET set_name='Shiny Star V', set_code='S4a', set_total='190'
  WHERE set_name ILIKE 'Shiny Star V%';
UPDATE public.cards SET set_name='Wizards Black Star Promos', set_code='WBSP'
  WHERE set_name ILIKE 'Wizards Black Star Promos%';
UPDATE public.cards SET set_name='Pokemon GO', set_code='PGO', set_total='78'
  WHERE set_name ILIKE 'Pok%mon GO';

-- 2) Mew V: Colpo Fusione (Fusion Strike), non Fiamme Oscure
UPDATE public.cards
   SET set_name='Colpo Fusione', set_code='SWSH8', year=2021,
       notes = COALESCE(NULLIF(notes,'') || ' | ', '') || 'Set corretto in Colpo Fusione: verificare numero carta.'
 WHERE card_name ILIKE 'Mew V%' AND set_name ILIKE 'Fiamme Oscure%';

-- 3) Raccoglitori
CREATE TABLE public.binders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'rosso',
  pages integer NOT NULL DEFAULT 20 CHECK (pages BETWEEN 1 AND 200),
  slots_per_page integer NOT NULL DEFAULT 9 CHECK (slots_per_page IN (4,9,12)),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.binders TO authenticated;
GRANT ALL ON public.binders TO service_role;

ALTER TABLE public.binders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "binders_owner_all" ON public.binders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER binders_updated BEFORE UPDATE ON public.binders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS binder_id uuid REFERENCES public.binders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS binder_page integer,
  ADD COLUMN IF NOT EXISTS binder_slot integer;

CREATE UNIQUE INDEX IF NOT EXISTS items_binder_slot_unique
  ON public.items (binder_id, binder_page, binder_slot)
  WHERE binder_id IS NOT NULL AND binder_page IS NOT NULL AND binder_slot IS NOT NULL;

CREATE INDEX IF NOT EXISTS items_binder_idx ON public.items (binder_id);

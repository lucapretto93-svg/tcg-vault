ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS qc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS qc_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS qc_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_qc_status_check'
  ) THEN
    ALTER TABLE public.items
      ADD CONSTRAINT items_qc_status_check CHECK (qc_status IN ('pending','completed'));
  END IF;
END $$;

-- Inizializzazione con criterio: pending ovunque, tranne le carte con evidenza reale
UPDATE public.items SET qc_status = 'pending', qc_completed_at = NULL;

UPDATE public.items i
SET qc_status = 'completed', qc_completed_at = now()
WHERE i.status <> 'SOLD'
  AND coalesce(i.notes, '') NOT ILIKE '%DA RIVEDERE%'
  AND EXISTS (SELECT 1 FROM public.condition_assessments ca WHERE ca.item_id = i.id)
  AND EXISTS (SELECT 1 FROM public.card_images ci WHERE ci.item_id = i.id AND ci.image_type = 'FRONT')
  AND EXISTS (SELECT 1 FROM public.card_images ci WHERE ci.item_id = i.id AND ci.image_type = 'BACK')
  AND EXISTS (SELECT 1 FROM public.market_prices mp WHERE mp.item_id = i.id);

CREATE INDEX IF NOT EXISTS items_qc_status_idx ON public.items (qc_status);
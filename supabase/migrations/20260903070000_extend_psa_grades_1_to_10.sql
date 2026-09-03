-- Extend grading estimates and market values to cover the complete PSA scale.
ALTER TABLE public.grading_assessments
  ADD COLUMN IF NOT EXISTS prob_psa1 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prob_psa2 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prob_psa3 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prob_psa4 NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prob_psa5 NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.grading_assessments
  DROP CONSTRAINT IF EXISTS grading_assessments_probabilities_check;

ALTER TABLE public.grading_assessments
  ADD CONSTRAINT grading_assessments_probabilities_check
  CHECK (
    prob_psa1 BETWEEN 0 AND 100 AND
    prob_psa2 BETWEEN 0 AND 100 AND
    prob_psa3 BETWEEN 0 AND 100 AND
    prob_psa4 BETWEEN 0 AND 100 AND
    prob_psa5 BETWEEN 0 AND 100 AND
    prob_psa6 BETWEEN 0 AND 100 AND
    prob_psa7 BETWEEN 0 AND 100 AND
    prob_psa8 BETWEEN 0 AND 100 AND
    prob_psa9 BETWEEN 0 AND 100 AND
    prob_psa10 BETWEEN 0 AND 100 AND
    prob_psa1 + prob_psa2 + prob_psa3 + prob_psa4 + prob_psa5 +
      prob_psa6 + prob_psa7 + prob_psa8 + prob_psa9 + prob_psa10 = 100
  );

ALTER TABLE public.market_prices
  DROP CONSTRAINT IF EXISTS market_prices_price_type_check;

ALTER TABLE public.market_prices
  ADD CONSTRAINT market_prices_price_type_check
  CHECK (
    price_type IN (
      'RAW',
      'PSA1', 'PSA2', 'PSA3', 'PSA4', 'PSA5',
      'PSA6', 'PSA7', 'PSA8', 'PSA9', 'PSA10',
      'SEALED'
    )
  );

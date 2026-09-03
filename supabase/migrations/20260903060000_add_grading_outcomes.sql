-- Preserve the original estimate and attach the result returned by the grader.
ALTER TABLE public.grading_assessments
  ADD COLUMN IF NOT EXISTS actual_company TEXT,
  ADD COLUMN IF NOT EXISTS actual_grade NUMERIC,
  ADD COLUMN IF NOT EXISTS certificate_number TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at DATE,
  ADD COLUMN IF NOT EXISTS graded_at DATE,
  ADD COLUMN IF NOT EXISTS returned_at DATE,
  ADD COLUMN IF NOT EXISTS actual_grading_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS result_notes TEXT;

ALTER TABLE public.grading_assessments
  DROP CONSTRAINT IF EXISTS grading_assessments_actual_grade_check;

ALTER TABLE public.grading_assessments
  ADD CONSTRAINT grading_assessments_actual_grade_check
  CHECK (actual_grade IS NULL OR (actual_grade >= 1 AND actual_grade <= 10));

ALTER TABLE public.grading_assessments
  DROP CONSTRAINT IF EXISTS grading_assessments_actual_grading_cost_check;

ALTER TABLE public.grading_assessments
  ADD CONSTRAINT grading_assessments_actual_grading_cost_check
  CHECK (actual_grading_cost IS NULL OR actual_grading_cost >= 0);

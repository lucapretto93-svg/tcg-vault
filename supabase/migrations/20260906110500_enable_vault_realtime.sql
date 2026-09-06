-- Keep every active Vault screen synchronized with writes made outside the UI.
-- Each table is added only when it is not already part of the publication so
-- this migration remains safe if Realtime was enabled manually beforehand.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'items',
    'cards',
    'card_images',
    'condition_assessments',
    'grading_assessments',
    'market_prices',
    'investment_decisions',
    'purchases',
    'purchase_items',
    'sales',
    'sale_items',
    'sealed_products',
    'portfolio_snapshots',
    'price_sources'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END
$$;

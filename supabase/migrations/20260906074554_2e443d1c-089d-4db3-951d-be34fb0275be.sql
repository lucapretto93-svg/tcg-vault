CREATE OR REPLACE FUNCTION public.item_visible(_item uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.items i
    WHERE i.id = _item
      AND (i.user_id = auth.uid() OR i.user_id IS NULL)
  );
$function$;

CREATE OR REPLACE FUNCTION public.purchase_visible(_p uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = _p
      AND (p.user_id = auth.uid() OR p.user_id IS NULL)
  );
$function$;

CREATE OR REPLACE FUNCTION public.sale_visible(_s uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = _s
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  );
$function$;

DROP POLICY IF EXISTS items_select ON public.items;
CREATE POLICY items_select ON public.items
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
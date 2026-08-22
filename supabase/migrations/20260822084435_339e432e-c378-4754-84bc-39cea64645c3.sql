
CREATE OR REPLACE FUNCTION public.item_visible(_item UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.items i WHERE i.id = _item);
$$;
CREATE OR REPLACE FUNCTION public.item_owned(_item UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.items i WHERE i.id = _item AND i.user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.purchase_visible(_p UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = _p);
$$;
CREATE OR REPLACE FUNCTION public.purchase_owned(_p UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = _p AND p.user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.sale_visible(_s UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sales s WHERE s.id = _s);
$$;
CREATE OR REPLACE FUNCTION public.sale_owned(_s UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sales s WHERE s.id = _s AND s.user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.item_visible(UUID), public.item_owned(UUID), public.purchase_visible(UUID), public.purchase_owned(UUID), public.sale_visible(UUID), public.sale_owned(UUID) FROM anon, PUBLIC;

CREATE OR REPLACE FUNCTION public.assign_item_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_user uuid := auth.uid();
  app_owner uuid;
  owner_count integer;
BEGIN
  IF NEW.is_demo THEN
    RETURN NEW;
  END IF;

  IF request_user IS NOT NULL THEN
    NEW.user_id := request_user;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT min(id), count(*)::integer
  INTO app_owner, owner_count
  FROM auth.users;

  IF owner_count <> 1 OR app_owner IS NULL THEN
    RAISE EXCEPTION 'Cannot assign item owner: expected exactly one app owner';
  END IF;

  NEW.user_id := app_owner;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_item_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS assign_item_owner_before_insert ON public.items;
CREATE TRIGGER assign_item_owner_before_insert
BEFORE INSERT ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.assign_item_owner();
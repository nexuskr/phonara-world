CREATE OR REPLACE FUNCTION public.admin_get_user_email(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  RETURN _email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid) TO authenticated;
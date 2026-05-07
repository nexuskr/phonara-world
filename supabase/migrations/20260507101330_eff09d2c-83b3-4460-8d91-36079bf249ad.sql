
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_admin boolean := (NEW.email = 'dreamtech123123@gmail.com');
BEGIN
  INSERT INTO public.profiles(id, nickname)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email,'@',1)))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallet_balances(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF _is_admin THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET tier='empire' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $function$;

-- Grant admin to that email if account already exists
INSERT INTO public.user_roles(user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email = 'dreamtech123123@gmail.com'
ON CONFLICT DO NOTHING;

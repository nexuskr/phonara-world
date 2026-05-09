-- Internal helper: builds Authorization header for pg_net edge function calls,
-- pulling the service_role key from Supabase Vault. Used by triggers/cron.
CREATE OR REPLACE FUNCTION public._edge_internal_auth_header()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_secret text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name IN ('service_role_key','SUPABASE_SERVICE_ROLE_KEY')
    ORDER BY CASE name WHEN 'service_role_key' THEN 1 ELSE 2 END
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN jsonb_build_object('Content-Type','application/json');
  END IF;

  RETURN jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer '||v_secret
  );
END
$$;

REVOKE ALL ON FUNCTION public._edge_internal_auth_header() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._edge_internal_auth_header() FROM anon, authenticated;

-- Update push-dispatch trigger to include service_role authorization.
CREATE OR REPLACE FUNCTION public.tg_notification_dispatch_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
  v_enabled boolean;
BEGIN
  SELECT COALESCE(np.enabled, true) INTO v_enabled
  FROM (SELECT 1) x
  LEFT JOIN public.notification_preferences np
    ON np.user_id = NEW.user_id AND np.channel = 'push' AND np.event = NEW.kind;
  IF v_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  v_url := 'https://ketlqzfaplppmupaiwft.supabase.co/functions/v1/send-push';

  PERFORM net.http_post(
    url := v_url,
    headers := public._edge_internal_auth_header(),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', COALESCE(NEW.body, ''),
      'kind', NEW.kind,
      'notification_id', NEW.id,
      'payload', NEW.payload
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
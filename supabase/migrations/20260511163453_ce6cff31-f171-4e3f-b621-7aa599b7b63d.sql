CREATE TABLE IF NOT EXISTS public.line_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id text NOT NULL,
  display_name text,
  link_token text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz,
  UNIQUE (line_user_id)
);

CREATE TABLE IF NOT EXISTS public.line_link_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_user ON public.line_link_tokens(user_id);

ALTER TABLE public.line_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_link_tokens   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS line_sub_self_select ON public.line_subscriptions;
CREATE POLICY line_sub_self_select ON public.line_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS line_sub_admin_all ON public.line_subscriptions;
CREATE POLICY line_sub_admin_all ON public.line_subscriptions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS line_link_token_self_select ON public.line_link_tokens;
CREATE POLICY line_link_token_self_select ON public.line_link_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.issue_line_link_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tok text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  tok := upper(substring(replace(gen_random_uuid()::text,'-','') for 8));
  INSERT INTO public.line_link_tokens(token, user_id) VALUES (tok, uid);
  RETURN tok;
END $$;

REVOKE ALL ON FUNCTION public.issue_line_link_token() FROM public;
GRANT EXECUTE ON FUNCTION public.issue_line_link_token() TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_notification_dispatch_line()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key text;
  edge_url text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
    SELECT decrypted_secret INTO edge_url
      FROM vault.decrypted_secrets WHERE name = 'edge_function_url' LIMIT 1;
    IF edge_url IS NULL OR service_role_key IS NULL THEN
      RETURN NEW;
    END IF;
    PERFORM net.http_post(
      url := edge_url || '/send-line',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer '||service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.body,
        'kind', NEW.kind,
        'notification_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notification_dispatch_line ON public.notifications;
CREATE TRIGGER notification_dispatch_line
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.tg_notification_dispatch_line();
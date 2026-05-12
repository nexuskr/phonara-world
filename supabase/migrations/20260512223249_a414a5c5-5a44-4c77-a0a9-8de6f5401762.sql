-- crown_replays table
CREATE TABLE IF NOT EXISTS public.crown_replays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid,
  public_token text NOT NULL UNIQUE,
  awarded_amount integer NOT NULL,
  variance numeric NOT NULL,
  empire_level integer NOT NULL DEFAULT 1,
  nickname_masked text,
  view_count integer NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crown_replays_user ON public.crown_replays(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crown_replays_token ON public.crown_replays(public_token);

ALTER TABLE public.crown_replays ENABLE ROW LEVEL SECURITY;

-- Owner can read their own replays (history)
CREATE POLICY "owner_select_own_replays"
  ON public.crown_replays FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "admin_select_all_replays"
  ON public.crown_replays FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No direct insert/update/delete by clients — only via SECURITY DEFINER RPCs.

-- Helper: mask nickname (same convention as crown_war_snapshot)
CREATE OR REPLACE FUNCTION public.mask_nickname(_nick text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_nick,'') = '' THEN 'Empire●●●'
    WHEN char_length(_nick) <= 2 THEN substr(_nick,1,1) || '●●'
    ELSE substr(_nick,1,1)
         || repeat('●', greatest(1, char_length(_nick)-2))
         || substr(_nick, char_length(_nick), 1)
  END;
$$;

-- Create replay from a crown_events row
CREATE OR REPLACE FUNCTION public.create_crown_replay(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_event record;
  v_token text;
  v_replay_id uuid;
  v_nick text;
  v_level int;
  v_existing record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT id, user_id, awarded_amount, variance INTO v_event
  FROM public.crown_events WHERE id = _event_id;

  IF v_event.id IS NULL THEN RAISE EXCEPTION 'event not found'; END IF;
  IF v_event.user_id <> v_user THEN RAISE EXCEPTION 'not owner'; END IF;
  IF COALESCE(v_event.variance, 0) < 2.0 THEN
    RAISE EXCEPTION 'replay only for variance >= 2.0';
  END IF;

  -- Idempotent per event
  SELECT id, public_token INTO v_existing
  FROM public.crown_replays WHERE event_id = _event_id LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('token', v_existing.public_token, 'replay_id', v_existing.id, 'duplicate', true);
  END IF;

  SELECT nickname, COALESCE(empire_level,1) INTO v_nick, v_level
    FROM public.profiles WHERE id = v_user;

  v_token := encode(gen_random_bytes(9), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');

  INSERT INTO public.crown_replays
    (user_id, event_id, public_token, awarded_amount, variance, empire_level, nickname_masked)
  VALUES
    (v_user, _event_id, v_token, v_event.awarded_amount, v_event.variance, v_level, public.mask_nickname(v_nick))
  RETURNING id INTO v_replay_id;

  RETURN jsonb_build_object('token', v_token, 'replay_id', v_replay_id, 'duplicate', false);
END $$;

-- Public read for landing — anonymous safe
CREATE OR REPLACE FUNCTION public.get_public_crown_replay(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT id, awarded_amount, variance, empire_level, nickname_masked,
         view_count, share_count, created_at, expires_at
    INTO r
    FROM public.crown_replays
   WHERE public_token = _token
     AND expires_at > now()
   LIMIT 1;
  IF r.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'awarded', r.awarded_amount,
    'variance', round(r.variance, 2),
    'level', r.empire_level,
    'nick', r.nickname_masked,
    'views', r.view_count,
    'shares', r.share_count,
    'created_at', r.created_at
  );
END $$;

CREATE OR REPLACE FUNCTION public.bump_crown_replay_view(_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.crown_replays SET view_count = view_count + 1
   WHERE public_token = _token AND expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.record_crown_replay_share(_token text, _channel text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _channel IS NULL OR length(_channel) > 32 THEN RETURN; END IF;
  UPDATE public.crown_replays
     SET share_count = share_count + 1
   WHERE public_token = _token AND expires_at > now();
END $$;

REVOKE ALL ON FUNCTION public.create_crown_replay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_crown_replay(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_crown_replay(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_crown_replay_view(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_crown_replay_share(text, text) TO anon, authenticated;
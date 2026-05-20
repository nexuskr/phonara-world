-- =====================================================================
-- P5-B Community Layer (apex_*) — money-flow git diff = 0
-- =====================================================================

-- Chat rooms ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apex_chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'global'
    CHECK (type IN ('global','squad','tournament')),
  host_user_id uuid,
  is_public boolean NOT NULL DEFAULT true,
  drand_round bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apex_chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apex_chat_rooms_public_read" ON public.apex_chat_rooms
  FOR SELECT USING (is_public = true OR host_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "apex_chat_rooms_admin_write" ON public.apex_chat_rooms
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Chat messages -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apex_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.apex_chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  drand_round bigint,
  drand_signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apex_chat_msg_room_time
  ON public.apex_chat_messages(room_id, created_at DESC);
ALTER TABLE public.apex_chat_messages ENABLE ROW LEVEL SECURITY;

-- Read: public-room messages are public to authenticated users; private rooms only host/admin
CREATE POLICY "apex_chat_msg_read" ON public.apex_chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.apex_chat_rooms r
      WHERE r.id = room_id
        AND (r.is_public = true OR r.host_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );
CREATE POLICY "apex_chat_msg_self_insert" ON public.apex_chat_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Squad rooms ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apex_squad_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  member_ids jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of uuids, length <= 3
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','locked','done')),
  current_bet_mirror jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apex_squad_rooms ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._apex_is_squad_member(_squad uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apex_squad_rooms s
    WHERE s.id = _squad
      AND (s.host_user_id = auth.uid() OR s.member_ids ? auth.uid()::text)
  );
$$;

CREATE POLICY "apex_squad_member_read" ON public.apex_squad_rooms
  FOR SELECT TO authenticated USING (
    host_user_id = auth.uid()
    OR member_ids ? auth.uid()::text
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "apex_squad_host_update" ON public.apex_squad_rooms
  FOR UPDATE TO authenticated USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

-- Mirror bets ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apex_squad_mirrors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.apex_squad_rooms(id) ON DELETE CASCADE,
  source_roll_id uuid NOT NULL,
  mirror_user_id uuid NOT NULL,
  amount_phon numeric NOT NULL CHECK (amount_phon >= 0),
  idem_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apex_squad_mirrors_squad
  ON public.apex_squad_mirrors(squad_id, created_at DESC);
ALTER TABLE public.apex_squad_mirrors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apex_squad_mirror_member_read" ON public.apex_squad_mirrors
  FOR SELECT TO authenticated USING (
    public._apex_is_squad_member(squad_id) OR public.has_role(auth.uid(),'admin')
  );

-- Tournaments ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apex_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id text NOT NULL,
  name text NOT NULL,
  prize_pool_phon numeric NOT NULL DEFAULT 0,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  bracket jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','live','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apex_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apex_tournaments_public_read" ON public.apex_tournaments
  FOR SELECT USING (true);
CREATE POLICY "apex_tournaments_admin_write" ON public.apex_tournaments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- RPCs (SECURITY DEFINER)
-- =====================================================================

-- 1) apex_send_chat_message — 3s throttle + 500-char cap
CREATE OR REPLACE FUNCTION public.apex_send_chat_message(
  _room_id uuid,
  _message text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_msg_id uuid;
  v_recent timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','not_authenticated');
  END IF;
  IF _message IS NULL OR char_length(btrim(_message)) = 0 THEN
    RETURN jsonb_build_object('ok',false,'error','empty_message');
  END IF;
  IF char_length(_message) > 500 THEN
    RETURN jsonb_build_object('ok',false,'error','message_too_long');
  END IF;
  -- 3s throttle per user
  SELECT MAX(created_at) INTO v_recent
  FROM public.apex_chat_messages
  WHERE user_id = v_user AND created_at > now() - interval '3 seconds';
  IF v_recent IS NOT NULL THEN
    RETURN jsonb_build_object('ok',false,'error','throttled');
  END IF;
  -- Room must exist and be readable
  IF NOT EXISTS (
    SELECT 1 FROM public.apex_chat_rooms r
    WHERE r.id = _room_id
      AND (r.is_public = true OR r.host_user_id = v_user OR public.has_role(v_user,'admin'))
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','room_not_accessible');
  END IF;
  INSERT INTO public.apex_chat_messages(room_id, user_id, message)
  VALUES (_room_id, v_user, btrim(_message))
  RETURNING id INTO v_msg_id;
  RETURN jsonb_build_object('ok',true,'message_id',v_msg_id);
END;
$$;

-- 2) apex_create_squad
CREATE OR REPLACE FUNCTION public.apex_create_squad()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','not_authenticated');
  END IF;
  INSERT INTO public.apex_squad_rooms(host_user_id, member_ids, status)
  VALUES (v_user, jsonb_build_array(v_user::text), 'open')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'squad_id',v_id);
END;
$$;

-- 3) apex_join_squad
CREATE OR REPLACE FUNCTION public.apex_join_squad(_squad_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_members jsonb;
  v_status text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','not_authenticated');
  END IF;
  SELECT member_ids, status INTO v_members, v_status
    FROM public.apex_squad_rooms WHERE id = _squad_id FOR UPDATE;
  IF v_members IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','squad_not_found');
  END IF;
  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('ok',false,'error','squad_locked');
  END IF;
  IF v_members ? v_user::text THEN
    RETURN jsonb_build_object('ok',true,'squad_id',_squad_id,'already_member',true);
  END IF;
  IF jsonb_array_length(v_members) >= 3 THEN
    RETURN jsonb_build_object('ok',false,'error','squad_full');
  END IF;
  UPDATE public.apex_squad_rooms
     SET member_ids = v_members || to_jsonb(v_user::text),
         updated_at = now()
   WHERE id = _squad_id;
  RETURN jsonb_build_object('ok',true,'squad_id',_squad_id);
END;
$$;

-- 4) apex_mirror_bet — wrapper around apex_place_bet_v2 (money flow untouched)
CREATE OR REPLACE FUNCTION public.apex_mirror_bet(
  _squad_id uuid,
  _source_roll_id uuid,
  _game_code text,
  _amount_phon numeric,
  _params jsonb,
  _idem_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_member boolean;
  v_res jsonb;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','not_authenticated');
  END IF;
  IF _amount_phon <= 0 THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_amount');
  END IF;
  SELECT (s.host_user_id = v_user OR s.member_ids ? v_user::text)
    INTO v_is_member
    FROM public.apex_squad_rooms s WHERE s.id = _squad_id;
  IF NOT COALESCE(v_is_member,false) THEN
    RETURN jsonb_build_object('ok',false,'error','not_squad_member');
  END IF;
  -- Idempotency: skip if already mirrored
  IF EXISTS (SELECT 1 FROM public.apex_squad_mirrors WHERE idem_key = _idem_key) THEN
    RETURN jsonb_build_object('ok',true,'mirrored',false,'reason','duplicate');
  END IF;
  -- Reuse the existing v2 betting pipeline (money flow git diff = 0)
  SELECT public.apex_place_bet_v2(
    _game_code := _game_code,
    _bet_phon  := _amount_phon,
    _bet_usdt  := 0,
    _params    := COALESCE(_params,'{}'::jsonb),
    _idem_key  := _idem_key
  ) INTO v_res;
  INSERT INTO public.apex_squad_mirrors(squad_id, source_roll_id, mirror_user_id, amount_phon, idem_key)
  VALUES (_squad_id, _source_roll_id, v_user, _amount_phon, _idem_key);
  RETURN jsonb_build_object('ok',true,'mirrored',true,'bet',v_res);
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.apex_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apex_squad_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apex_squad_mirrors;

-- Seed: global lobby room
INSERT INTO public.apex_chat_rooms (name, type, is_public)
SELECT 'Global Lobby', 'global', true
WHERE NOT EXISTS (SELECT 1 FROM public.apex_chat_rooms WHERE type='global' AND name='Global Lobby');
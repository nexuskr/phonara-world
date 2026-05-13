-- ============================================
-- #3: War Trading e-sports
-- ============================================

-- 1) war_sessions: 5분 슬롯
CREATE TABLE IF NOT EXISTS public.war_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_starts_at timestamptz NOT NULL UNIQUE,
  slot_ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','settling','closed')),
  participants int NOT NULL DEFAULT 0,
  winner_user_id uuid NULL,
  winner_pnl_pct numeric NULL,
  prize_phon numeric NOT NULL DEFAULT 5000,
  is_simulated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_war_sessions_status ON public.war_sessions(status, slot_starts_at DESC);

ALTER TABLE public.war_sessions ENABLE ROW LEVEL SECURITY;

-- 누구나 SELECT (공개 e-sports)
CREATE POLICY "war_sessions_public_select"
ON public.war_sessions FOR SELECT
USING (true);

CREATE POLICY "war_sessions_admin_all"
ON public.war_sessions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) war_entries: 사용자별 진입 기록
CREATE TABLE IF NOT EXISTS public.war_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.war_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NULL,
  sim_pnl_pct numeric NOT NULL DEFAULT 0,
  near_miss_count int NOT NULL DEFAULT 0,
  combo_max int NOT NULL DEFAULT 0,
  prize_phon numeric NOT NULL DEFAULT 0,
  is_simulated boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz NULL,
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_war_entries_session_pnl ON public.war_entries(session_id, sim_pnl_pct DESC);
CREATE INDEX IF NOT EXISTS idx_war_entries_user ON public.war_entries(user_id, joined_at DESC);

ALTER TABLE public.war_entries ENABLE ROW LEVEL SECURITY;

-- 누구나 SELECT (리더보드 공개)
CREATE POLICY "war_entries_public_select"
ON public.war_entries FOR SELECT
USING (true);

CREATE POLICY "war_entries_admin_all"
ON public.war_entries FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public._war_entries_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_war_entries_touch ON public.war_entries;
CREATE TRIGGER trg_war_entries_touch
BEFORE UPDATE ON public.war_entries
FOR EACH ROW EXECUTE FUNCTION public._war_entries_touch();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_entries;

-- 3) RPC: war_get_current_session
CREATE OR REPLACE FUNCTION public.war_get_current_session()
RETURNS public.war_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_slot_start timestamptz;
  v_row public.war_sessions;
BEGIN
  -- 5분 단위 슬롯 시작 시각 계산
  v_slot_start := date_trunc('hour', v_now) +
    (floor(extract(minute FROM v_now) / 5) * interval '5 minutes');

  SELECT * INTO v_row FROM public.war_sessions
  WHERE slot_starts_at = v_slot_start;

  IF v_row.id IS NULL THEN
    INSERT INTO public.war_sessions(slot_starts_at, slot_ends_at, status, prize_phon)
    VALUES (v_slot_start, v_slot_start + interval '5 minutes', 'open', 5000)
    ON CONFLICT (slot_starts_at) DO UPDATE SET status = war_sessions.status
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.war_get_current_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.war_get_current_session() TO anon, authenticated;

-- 4) RPC: war_join_session
CREATE OR REPLACE FUNCTION public.war_join_session()
RETURNS public.war_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.war_sessions;
  v_entry public.war_entries;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  v_session := public.war_get_current_session();

  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'session_closed';
  END IF;

  SELECT display_name INTO v_name FROM public.profiles WHERE id = v_uid LIMIT 1;

  INSERT INTO public.war_entries(session_id, user_id, display_name)
  VALUES (v_session.id, v_uid, COALESCE(v_name, '익명'))
  ON CONFLICT (session_id, user_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO v_entry;

  UPDATE public.war_sessions
  SET participants = (SELECT count(*) FROM public.war_entries WHERE session_id = v_session.id)
  WHERE id = v_session.id;

  RETURN v_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.war_join_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.war_join_session() TO authenticated;

-- 5) RPC: war_record_pnl
CREATE OR REPLACE FUNCTION public.war_record_pnl(_pnl_pct numeric, _near_miss int DEFAULT 0, _combo int DEFAULT 0)
RETURNS public.war_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.war_sessions;
  v_row public.war_entries;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  v_session := public.war_get_current_session();

  UPDATE public.war_entries
  SET sim_pnl_pct = _pnl_pct,
      near_miss_count = GREATEST(near_miss_count, COALESCE(_near_miss, 0)),
      combo_max = GREATEST(combo_max, COALESCE(_combo, 0))
  WHERE session_id = v_session.id AND user_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'not_joined';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.war_record_pnl(numeric, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.war_record_pnl(numeric, int, int) TO authenticated;

-- 6) RPC: war_get_leaderboard
CREATE OR REPLACE FUNCTION public.war_get_leaderboard(_session_id uuid DEFAULT NULL, _limit int DEFAULT 10)
RETURNS TABLE (
  rank int,
  display_name text,
  sim_pnl_pct numeric,
  combo_max int,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sid uuid := _session_id;
BEGIN
  IF v_sid IS NULL THEN
    SELECT id INTO v_sid FROM public.war_sessions
    WHERE status = 'open' ORDER BY slot_starts_at DESC LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT
    (row_number() OVER (ORDER BY e.sim_pnl_pct DESC, e.joined_at ASC))::int AS rank,
    -- 마스킹: 첫 글자 + ****
    CASE
      WHEN e.user_id = v_uid THEN COALESCE(e.display_name, '나')
      ELSE COALESCE(left(e.display_name, 1), '?') || '****'
    END AS display_name,
    e.sim_pnl_pct,
    e.combo_max,
    (e.user_id = v_uid) AS is_self
  FROM public.war_entries e
  WHERE e.session_id = v_sid
  ORDER BY e.sim_pnl_pct DESC, e.joined_at ASC
  LIMIT GREATEST(_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.war_get_leaderboard(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.war_get_leaderboard(uuid, int) TO anon, authenticated;

-- 7) RPC: war_settle_session (admin/service only)
CREATE OR REPLACE FUNCTION public.war_settle_session(_session_id uuid)
RETURNS public.war_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.war_sessions;
  v_winner public.war_entries;
BEGIN
  -- admin 또는 service_role만
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  SELECT * INTO v_session FROM public.war_sessions WHERE id = _session_id;
  IF v_session.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_session.status = 'closed' THEN RETURN v_session; END IF;

  UPDATE public.war_sessions SET status = 'settling' WHERE id = _session_id;

  SELECT * INTO v_winner FROM public.war_entries
  WHERE session_id = _session_id
  ORDER BY sim_pnl_pct DESC, joined_at ASC
  LIMIT 1;

  IF v_winner.id IS NOT NULL THEN
    UPDATE public.war_entries
    SET prize_phon = v_session.prize_phon, settled_at = now()
    WHERE id = v_winner.id;
  END IF;

  UPDATE public.war_sessions
  SET status = 'closed',
      winner_user_id = v_winner.user_id,
      winner_pnl_pct = v_winner.sim_pnl_pct,
      settled_at = now()
  WHERE id = _session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

REVOKE ALL ON FUNCTION public.war_settle_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.war_settle_session(uuid) TO authenticated, service_role;

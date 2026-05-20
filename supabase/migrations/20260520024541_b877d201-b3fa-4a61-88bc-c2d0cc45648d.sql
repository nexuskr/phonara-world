
-- ============ P5-C: Apocalypse Cup ============
CREATE TABLE IF NOT EXISTS public.apex_cup_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prize_pool_phon numeric NOT NULL DEFAULT 0,
  entry_fee_phon numeric NOT NULL DEFAULT 0,
  bracket_size int NOT NULL DEFAULT 64 CHECK (bracket_size IN (64,128)),
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','settling','done')),
  drand_seed_round bigint,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apex_cup_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_cup_seasons_public_read" ON public.apex_cup_seasons FOR SELECT USING (true);
CREATE POLICY "apex_cup_seasons_admin_write" ON public.apex_cup_seasons
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.apex_cup_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.apex_cup_seasons(id) ON DELETE CASCADE,
  round int NOT NULL,
  slot_index int NOT NULL,
  player_a_id uuid,
  player_b_id uuid,
  winner_id uuid,
  drand_round bigint,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_id, round, slot_index)
);
ALTER TABLE public.apex_cup_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_cup_brackets_public_read" ON public.apex_cup_brackets FOR SELECT USING (true);
CREATE POLICY "apex_cup_brackets_admin_write" ON public.apex_cup_brackets
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.apex_cup_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.apex_cup_seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entry_paid_phon numeric NOT NULL DEFAULT 0,
  eliminated_at timestamptz,
  final_rank int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);
ALTER TABLE public.apex_cup_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_cup_entries_self_read" ON public.apex_cup_entries FOR SELECT USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "apex_cup_entries_public_leaderboard" ON public.apex_cup_entries FOR SELECT USING (true);
CREATE POLICY "apex_cup_entries_admin_write" ON public.apex_cup_entries
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============ P5-E: Cashout chains ============
CREATE TABLE IF NOT EXISTS public.apex_cashout_chains (
  chain_code text PRIMARY KEY,
  label text NOT NULL,
  native boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  min_phon numeric NOT NULL DEFAULT 1000,
  fee_bps int NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apex_cashout_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_chains_public_read" ON public.apex_cashout_chains FOR SELECT USING (enabled=true OR has_role(auth.uid(),'admin'));
CREATE POLICY "apex_chains_admin_write" ON public.apex_cashout_chains
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.apex_cashout_chains(chain_code,label,native,min_phon,fee_bps) VALUES
  ('SOL','Solana',true,1000,30),
  ('SUI','Sui',true,1000,30),
  ('APT','Aptos',true,1000,30),
  ('CCTP_V2','Circle CCTP v2',true,500,20)
ON CONFLICT (chain_code) DO NOTHING;

-- ============ P5-D: VRF v3 columns ============
ALTER TABLE public.apex_randomness_requests
  ADD COLUMN IF NOT EXISTS vrf_version text DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS quorum_n int,
  ADD COLUMN IF NOT EXISTS quorum_k int,
  ADD COLUMN IF NOT EXISTS participating_nodes jsonb;

-- ============ RPC: apex_cup_enter ============
CREATE OR REPLACE FUNCTION public.apex_cup_enter(_season_id uuid, _idem_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_season public.apex_cup_seasons%ROWTYPE;
  v_bet jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO v_season FROM public.apex_cup_seasons WHERE id=_season_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'season_not_found'; END IF;
  IF v_season.status NOT IN ('scheduled','live') THEN RAISE EXCEPTION 'season_closed'; END IF;
  IF EXISTS (SELECT 1 FROM public.apex_cup_entries WHERE season_id=_season_id AND user_id=v_uid) THEN
    RAISE EXCEPTION 'already_entered';
  END IF;
  -- 머니플로: 기존 wrapper 재사용
  v_bet := public.apex_place_bet_v2(
    'cup_entry',
    v_season.entry_fee_phon,
    0,
    jsonb_build_object('season_id',_season_id,'kind','cup_entry'),
    COALESCE(_idem_key, _season_id::text||':'||v_uid::text)
  );
  INSERT INTO public.apex_cup_entries(season_id,user_id,entry_paid_phon)
    VALUES (_season_id, v_uid, v_season.entry_fee_phon);
  RETURN jsonb_build_object('ok',true,'season',_season_id,'paid',v_season.entry_fee_phon,'bet',v_bet);
END;$$;

-- ============ RPC: apex_cup_get_season ============
CREATE OR REPLACE FUNCTION public.apex_cup_get_season(_season_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT jsonb_build_object(
    'season', to_jsonb(s.*),
    'brackets', COALESCE((SELECT jsonb_agg(to_jsonb(b.*) ORDER BY b.round, b.slot_index)
                          FROM public.apex_cup_brackets b WHERE b.season_id=s.id), '[]'::jsonb),
    'entries_count', (SELECT count(*) FROM public.apex_cup_entries WHERE season_id=s.id),
    'my_entry', (SELECT to_jsonb(e.*) FROM public.apex_cup_entries e
                  WHERE e.season_id=s.id AND e.user_id=auth.uid())
  )
  FROM public.apex_cup_seasons s WHERE s.id=_season_id;
$$;

-- ============ RPC: apex_cup_get_leaderboard ============
CREATE OR REPLACE FUNCTION public.apex_cup_get_leaderboard(_season_id uuid, _limit int DEFAULT 20)
RETURNS TABLE(user_id uuid, final_rank int, entry_paid_phon numeric, eliminated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT user_id, final_rank, entry_paid_phon, eliminated_at
  FROM public.apex_cup_entries
  WHERE season_id=_season_id
  ORDER BY final_rank NULLS LAST, eliminated_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

-- ============ RPC: apex_admin_cup_create_season ============
CREATE OR REPLACE FUNCTION public.apex_admin_cup_create_season(
  _name text, _prize_pool_phon numeric, _entry_fee_phon numeric,
  _bracket_size int, _start_at timestamptz, _end_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  INSERT INTO public.apex_cup_seasons(name,prize_pool_phon,entry_fee_phon,bracket_size,start_at,end_at,status)
    VALUES (_name,_prize_pool_phon,_entry_fee_phon,_bracket_size,_start_at,_end_at,'scheduled')
    RETURNING id INTO v_id;
  RETURN v_id;
END;$$;

GRANT EXECUTE ON FUNCTION public.apex_cup_enter(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apex_cup_get_season(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apex_cup_get_leaderboard(uuid,int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apex_admin_cup_create_season(text,numeric,numeric,int,timestamptz,timestamptz) TO authenticated;

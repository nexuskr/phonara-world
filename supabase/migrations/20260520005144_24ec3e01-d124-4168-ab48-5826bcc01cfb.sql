
-- ============================================================
-- P3-A Live Crash V2 — Server-authoritative Crash + Provably-Fair v2
-- 머니플로 8경로 0 터치. 새 테이블/RPC 만 추가.
-- ============================================================

-- 1) Signing keys (Ed25519 공개키 회전 추적)
CREATE TABLE IF NOT EXISTS public.apex_signing_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alg text NOT NULL DEFAULT 'Ed25519' CHECK (alg = 'Ed25519'),
  public_key_b64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);
ALTER TABLE public.apex_signing_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY apex_signing_keys_public_read ON public.apex_signing_keys
  FOR SELECT USING (true);

-- 2) Rounds
CREATE TABLE IF NOT EXISTS public.apex_crash_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_no bigserial UNIQUE NOT NULL,
  server_seed text,                 -- reveal 시점에만 채움
  server_seed_hash text NOT NULL,   -- 사전 공개 (SHA-256 hex)
  public_seed text NOT NULL,
  nonce bigint NOT NULL DEFAULT 0,
  crash_x numeric(10,4),            -- bust 후 채움
  started_at timestamptz,
  busted_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','busted','revealed')),
  ed25519_pubkey_id uuid REFERENCES public.apex_signing_keys(id),
  ed25519_signature text,           -- base64
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apex_crash_rounds_status ON public.apex_crash_rounds(status);
CREATE INDEX IF NOT EXISTS idx_apex_crash_rounds_round_no ON public.apex_crash_rounds(round_no DESC);

ALTER TABLE public.apex_crash_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY apex_crash_rounds_public_read ON public.apex_crash_rounds
  FOR SELECT USING (true);

-- 3) Bets
CREATE TABLE IF NOT EXISTS public.apex_crash_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.apex_crash_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stake_phon numeric(20,4) NOT NULL CHECK (stake_phon > 0),
  auto_cashout_x numeric(10,4),
  cashout_x numeric(10,4),
  payout_phon numeric(20,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','cashed','lost')),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_apex_crash_bets_round ON public.apex_crash_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_apex_crash_bets_user ON public.apex_crash_bets(user_id, created_at DESC);

ALTER TABLE public.apex_crash_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY apex_crash_bets_self_read ON public.apex_crash_bets
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 4) RPC: place bet (pending 라운드만)
CREATE OR REPLACE FUNCTION public.apex_crash_place_bet(
  _round_id uuid,
  _stake numeric,
  _auto_cashout numeric,
  _idem_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
  v_bet_id uuid;
  v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _stake IS NULL OR _stake <= 0 THEN RAISE EXCEPTION 'invalid_stake'; END IF;
  IF _auto_cashout IS NOT NULL AND _auto_cashout < 1.01 THEN
    RAISE EXCEPTION 'invalid_auto_cashout';
  END IF;

  -- idempotency 단락
  SELECT id INTO v_existing FROM public.apex_crash_bets
   WHERE user_id = v_uid AND idempotency_key = _idem_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  -- round lock + status guard
  SELECT status INTO v_status
    FROM public.apex_crash_rounds
   WHERE id = _round_id
   FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'round_not_found'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'round_not_open'; END IF;

  INSERT INTO public.apex_crash_bets
    (round_id, user_id, stake_phon, auto_cashout_x, idempotency_key)
  VALUES (_round_id, v_uid, _stake, _auto_cashout, _idem_key)
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;

-- 5) RPC: cashout (running 중 + 현재 tick × stake)
CREATE OR REPLACE FUNCTION public.apex_crash_cashout(
  _round_id uuid,
  _current_x numeric,
  _idem_key text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bet record;
  v_round record;
  v_payout numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _current_x IS NULL OR _current_x < 1 THEN RAISE EXCEPTION 'invalid_tick'; END IF;

  SELECT * INTO v_round FROM public.apex_crash_rounds
   WHERE id = _round_id FOR UPDATE;
  IF v_round.status <> 'running' THEN RAISE EXCEPTION 'round_not_running'; END IF;

  SELECT * INTO v_bet FROM public.apex_crash_bets
   WHERE round_id = _round_id AND user_id = v_uid AND status = 'open'
   FOR UPDATE;
  IF v_bet.id IS NULL THEN RAISE EXCEPTION 'no_open_bet'; END IF;

  -- idempotent re-call returns existing payout
  IF v_bet.cashout_x IS NOT NULL THEN
    RETURN v_bet.payout_phon;
  END IF;

  v_payout := round((v_bet.stake_phon * _current_x)::numeric, 4);

  UPDATE public.apex_crash_bets
     SET cashout_x = _current_x,
         payout_phon = v_payout,
         status = 'cashed',
         settled_at = now()
   WHERE id = v_bet.id;

  RETURN v_payout;
END;
$$;

-- 6) RPC: get round (revealed 상태에서만 평문 server_seed)
CREATE OR REPLACE FUNCTION public.apex_crash_get_round(_round_no bigint)
RETURNS TABLE (
  round_no bigint,
  server_seed text,
  server_seed_hash text,
  public_seed text,
  nonce bigint,
  crash_x numeric,
  status text,
  ed25519_signature text,
  ed25519_public_key_b64 text,
  busted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.round_no,
         CASE WHEN r.status = 'revealed' THEN r.server_seed ELSE NULL END,
         r.server_seed_hash,
         r.public_seed,
         r.nonce,
         r.crash_x,
         r.status,
         r.ed25519_signature,
         k.public_key_b64,
         r.busted_at
  FROM public.apex_crash_rounds r
  LEFT JOIN public.apex_signing_keys k ON k.id = r.ed25519_pubkey_id
  WHERE r.round_no = _round_no;
$$;

GRANT EXECUTE ON FUNCTION public.apex_crash_place_bet(uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apex_crash_cashout(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apex_crash_get_round(bigint) TO anon, authenticated;

-- 7) Realtime publication (라운드 상태 변화만)
ALTER PUBLICATION supabase_realtime ADD TABLE public.apex_crash_rounds;

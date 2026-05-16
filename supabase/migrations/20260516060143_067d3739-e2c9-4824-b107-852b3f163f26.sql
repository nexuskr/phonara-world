
-- Provably-fair round proof (returns seed only after crash)
CREATE OR REPLACE FUNCTION public.crash_get_round_proof(_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v record;
BEGIN
  SELECT id, seed_hash, seed, seed_revealed, crash_multiplier, status, crashed_at, started_at, created_at
    INTO v
  FROM public.crash_rounds
  WHERE id = _round_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'id', v.id,
    'seed_hash', v.seed_hash,
    'seed', CASE WHEN v.seed_revealed THEN v.seed ELSE NULL END,
    'seed_revealed', v.seed_revealed,
    'crash_multiplier', CASE WHEN v.status = 'crashed' THEN v.crash_multiplier ELSE NULL END,
    'status', v.status,
    'crashed_at', v.crashed_at,
    'started_at', v.started_at,
    'created_at', v.created_at
  );
END;$$;

GRANT EXECUTE ON FUNCTION public.crash_get_round_proof(uuid) TO authenticated, anon;

-- My crash history with filter
CREATE OR REPLACE FUNCTION public.crash_get_my_history(_limit int DEFAULT 50, _offset int DEFAULT 0, _filter text DEFAULT 'all')
RETURNS TABLE (
  bet_id uuid,
  round_id uuid,
  seed_hash text,
  crash_multiplier numeric,
  crashed_at timestamptz,
  bet_phon numeric,
  auto_cashout numeric,
  cashed_out_at_multiplier numeric,
  payout_phon numeric,
  bonus_mult numeric,
  won boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  RETURN QUERY
  SELECT b.id, r.id, r.seed_hash, r.crash_multiplier, r.crashed_at,
         b.bet_phon, b.auto_cashout, b.cashed_out_at_multiplier, b.payout_phon, b.bonus_mult,
         b.won, b.created_at
  FROM public.crash_bets b
  JOIN public.crash_rounds r ON r.id = b.round_id
  WHERE b.user_id = v_uid
    AND CASE
      WHEN _filter = 'won'    THEN b.won = true
      WHEN _filter = 'lost'   THEN b.won = false
      WHEN _filter = 'cashed' THEN b.cashed_out_at_multiplier IS NOT NULL
      WHEN _filter = 'busted' THEN b.won = false AND b.cashed_out_at_multiplier IS NULL
      WHEN _filter = 'today'  THEN b.created_at >= (now() - interval '24 hours')
      WHEN _filter = '7d'     THEN b.created_at >= (now() - interval '7 days')
      ELSE true
    END
  ORDER BY b.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200))
  OFFSET GREATEST(0, _offset);
END;$$;

GRANT EXECUTE ON FUNCTION public.crash_get_my_history(int, int, text) TO authenticated;

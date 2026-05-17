
CREATE OR REPLACE FUNCTION public.get_live_fomo_counters()
RETURNS TABLE (
  withdrawing_now integer,
  trading_now integer,
  founding_seat_contenders integer,
  online_now integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    w AS (
      SELECT COUNT(*)::int AS c
      FROM withdrawal_requests
      WHERE status IN ('pending','processing','approved')
        AND created_at > now() - interval '10 minutes'
    ),
    t AS (
      SELECT COUNT(*)::int AS c
      FROM live_positions
      WHERE status = 'open'
    ),
    o AS (
      SELECT COUNT(DISTINCT user_id)::int AS c
      FROM live_positions
      WHERE opened_at > now() - interval '15 minutes'
    )
  SELECT
    GREATEST(3,  (SELECT c FROM w)) AS withdrawing_now,
    GREATEST(8,  (SELECT c FROM t)) AS trading_now,
    GREATEST(7,  FLOOR((SELECT c FROM t) * 0.35)::int + 7) AS founding_seat_contenders,
    GREATEST(12, (SELECT c FROM o)) AS online_now;
$$;

REVOKE ALL ON FUNCTION public.get_live_fomo_counters() FROM public;
GRANT EXECUTE ON FUNCTION public.get_live_fomo_counters() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_friend_ranking(_limit int DEFAULT 5)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  weekly_phon bigint,
  is_me boolean,
  rnk integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH friends AS (
    SELECT _me AS uid
    UNION
    SELECT inviter_id FROM referrals WHERE invitee_id = _me
    UNION
    SELECT invitee_id FROM referrals WHERE inviter_id = _me
  ),
  earn_ref AS (
    SELECT inviter_id AS uid, COALESCE(SUM(commission),0)::bigint AS amt
    FROM referral_earnings
    WHERE inviter_id IN (SELECT uid FROM friends)
      AND created_at > now() - interval '7 days'
    GROUP BY inviter_id
  ),
  earn_streak AS (
    SELECT sm.user_id AS uid, COALESCE(SUM(sm.phon_bonus),0)::bigint AS amt
    FROM streak_milestones sm
    WHERE sm.user_id IN (SELECT uid FROM friends)
      AND sm.awarded_at > now() - interval '7 days'
    GROUP BY sm.user_id
  ),
  earn_chest AS (
    SELECT dco.user_id AS uid, COALESCE(SUM(dco.phon_reward),0)::bigint AS amt
    FROM daily_chest_opens dco
    WHERE dco.user_id IN (SELECT uid FROM friends)
      AND dco.opened_at > now() - interval '7 days'
    GROUP BY dco.user_id
  ),
  totals AS (
    SELECT f.uid,
      COALESCE((SELECT amt FROM earn_ref er WHERE er.uid=f.uid),0)
      + COALESCE((SELECT amt FROM earn_streak es WHERE es.uid=f.uid),0)
      + COALESCE((SELECT amt FROM earn_chest ec WHERE ec.uid=f.uid),0) AS amt
    FROM friends f
  ),
  ranked AS (
    SELECT t.uid, t.amt,
      ROW_NUMBER() OVER (ORDER BY t.amt DESC, t.uid) AS rn
    FROM totals t
  )
  SELECT
    r.uid AS user_id,
    CASE
      WHEN r.uid = _me THEN COALESCE(p.nickname,'폐하')
      ELSE COALESCE(substr(p.nickname,1,2),'황제') || '***'
    END AS nickname,
    r.amt AS weekly_phon,
    (r.uid = _me) AS is_me,
    r.rn::int AS rnk
  FROM ranked r
  LEFT JOIN profiles p ON p.user_id = r.uid
  ORDER BY r.rn
  LIMIT GREATEST(1, LEAST(_limit, 20));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_friend_ranking(int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_friend_ranking(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_friend_gap()
RETURNS TABLE (
  direction text,
  gap_phon  bigint,
  other_nickname text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _me_amt bigint := 0;
  _me_rank int := 0;
  _other_amt bigint;
  _other_nick text;
BEGIN
  IF _me IS NULL THEN RETURN; END IF;

  CREATE TEMP TABLE IF NOT EXISTS _tmp_fr ON COMMIT DROP AS
    SELECT * FROM public.get_my_friend_ranking(20);

  SELECT weekly_phon, rnk INTO _me_amt, _me_rank
  FROM _tmp_fr WHERE is_me LIMIT 1;

  IF _me_rank IS NULL THEN RETURN; END IF;

  SELECT weekly_phon, nickname INTO _other_amt, _other_nick
  FROM _tmp_fr WHERE rnk = _me_rank + 1 LIMIT 1;

  IF _other_amt IS NOT NULL THEN
    direction := 'ahead';
    gap_phon  := GREATEST(0, _me_amt - _other_amt);
    other_nickname := _other_nick;
    RETURN NEXT; RETURN;
  END IF;

  SELECT weekly_phon, nickname INTO _other_amt, _other_nick
  FROM _tmp_fr WHERE rnk = _me_rank - 1 LIMIT 1;

  IF _other_amt IS NOT NULL THEN
    direction := 'behind';
    gap_phon  := GREATEST(0, _other_amt - _me_amt);
    other_nickname := _other_nick;
    RETURN NEXT; RETURN;
  END IF;

  direction := 'alone';
  gap_phon  := 0;
  other_nickname := '';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_friend_gap() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_friend_gap() TO authenticated;

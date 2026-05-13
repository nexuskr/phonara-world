-- P1-6 — 100만 명 활동 시뮬레이션: bot_settings 확장 + 공개 RPC 추가
ALTER TABLE public.bot_settings
  ADD COLUMN IF NOT EXISTS target_total_users INTEGER NOT NULL DEFAULT 1000000,
  ADD COLUMN IF NOT EXISTS daily_growth_min INTEGER NOT NULL DEFAULT 320,
  ADD COLUMN IF NOT EXISTS daily_growth_max INTEGER NOT NULL DEFAULT 1180;

-- 누적 가입자(시드 1M + 매일 결정론적 성장) — 공개 RPC
CREATE OR REPLACE FUNCTION public.get_bot_total_users()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  base INTEGER;
  growth INTEGER;
  days_since INTEGER;
  seed INTEGER;
BEGIN
  SELECT target_total_users, daily_growth_min, daily_growth_max, enabled, strength_pct
    INTO s FROM public.bot_settings WHERE id = 1;
  IF NOT FOUND OR NOT COALESCE(s.enabled, false) OR COALESCE(s.strength_pct, 0) = 0 THEN
    RETURN 0;
  END IF;
  base := COALESCE(s.target_total_users, 1000000);
  -- 시드: 2024-01-01 부터 경과 일수
  days_since := GREATEST(0, (CURRENT_DATE - DATE '2024-01-01'));
  -- 결정론적 일일 성장 (min~max 사이) — 일자별 해시
  seed := abs(hashtext(to_char(CURRENT_DATE, 'YYYY-MM-DD')));
  growth := COALESCE(s.daily_growth_min, 320)
          + (seed % GREATEST(1, COALESCE(s.daily_growth_max, 1180) - COALESCE(s.daily_growth_min, 320)));
  -- 누적: base + (지난 30일 평균 성장 * days_since 의 1/3 — 너무 빨리 안 부풀게)
  RETURN base + LEAST(days_since, 365) * growth / 3;
END;
$$;

REVOKE ALL ON FUNCTION public.get_bot_total_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bot_total_users() TO anon, authenticated;

-- 라이브 랭킹 (상위 N) — 결정론적 닉네임/금액
CREATE OR REPLACE FUNCTION public.get_bot_live_ranking(_limit INTEGER DEFAULT 100)
RETURNS TABLE(rank INTEGER, nickname TEXT, amount BIGINT, tier TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enabled BOOLEAN;
BEGIN
  SELECT bs.enabled INTO enabled FROM public.bot_settings bs WHERE bs.id = 1;
  IF NOT COALESCE(enabled, false) THEN
    RETURN;
  END IF;
  _limit := LEAST(GREATEST(_limit, 1), 200);
  RETURN QUERY
  WITH seeds AS (
    SELECT
      i AS r,
      abs(hashtext('rank_' || i || '_' || to_char(date_trunc('hour', now()), 'YYYY-MM-DD-HH24'))) AS h
    FROM generate_series(1, _limit) AS i
  ),
  picks AS (
    SELECT
      r,
      h,
      CASE WHEN r <= 3  THEN 'EMPIRE'
           WHEN r <= 10 THEN 'GOD'
           WHEN r <= 30 THEN 'VIP'
           ELSE 'NORMAL' END AS tier_v,
      -- 금액: 상위로 갈수록 큼 (결정론적)
      CASE WHEN r <= 3  THEN 80000000 + (h % 90000000)
           WHEN r <= 10 THEN 12000000 + (h % 28000000)
           WHEN r <= 30 THEN 1800000  + (h % 6000000)
           ELSE 90000 + (h % 800000) END AS amt
    FROM seeds
  )
  SELECT
    p.r::INTEGER AS rank,
    -- 마스킹된 닉네임 시드 (k-pop/사이버 스타일)
    (CASE (p.h % 8)
       WHEN 0 THEN 'Cyber'
       WHEN 1 THEN 'Neon'
       WHEN 2 THEN 'Aurora'
       WHEN 3 THEN 'Phantom'
       WHEN 4 THEN 'Nova'
       WHEN 5 THEN 'Onyx'
       WHEN 6 THEN 'Lunar'
       ELSE 'Ember' END
      || substr(md5(p.h::text), 1, 1)
      || '***'
      || substr(md5(p.h::text), 2, 1))::TEXT AS nickname,
    p.amt::BIGINT AS amount,
    p.tier_v::TEXT AS tier
  FROM picks p
  ORDER BY p.r;
END;
$$;

REVOKE ALL ON FUNCTION public.get_bot_live_ranking(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bot_live_ranking(INTEGER) TO anon, authenticated;
-- =====================================================================
-- Phase 5 STUB v1.2 (self-healing + column-aware policies)
-- 대상: 독립 백엔드 wyhhdyrvqtoejvusnhva ONLY
-- 관리형 ketlqzfaplppmupaiwft 에는 절대 실행 금지 (READ-ONLY)
--
-- v1.1 → v1.2 변경점:
--   - 모든 함수 앞에 DROP FUNCTION IF EXISTS (시그니처 충돌 방지)
--   - 정책 생성을 DO 블록으로 감싸서 user_id 컬럼이 실제 존재할 때만 생성
--   - 컬럼 없으면 RAISE NOTICE 로 어떤 테이블이 스킵됐는지 알림
--   - 상단에 preflight 진단 SELECT
--
-- 실행 전 체크:
--   1) 이 파일 1번째 줄에 "Phase 5 STUB v1.2" 가 있는가
--   2) Supabase SQL Editor 좌상단이 wyhhdyrvqtoejvusnhva 인가
--   3) 새 탭에 통째로 붙여넣었는가 (구버전 탭 재사용 금지)
-- =====================================================================

-- ---------- PREFLIGHT (트랜잭션 밖, 진단용) ----------
SELECT
  t AS tablename,
  (EXISTS (SELECT 1 FROM information_schema.tables
           WHERE table_schema='public' AND table_name=t)) AS table_exists,
  (EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name=t AND column_name='user_id')) AS has_user_id
FROM unnest(ARRAY[
  'user_roles','wallet_balances','account_freezes',
  'user_achievements','user_achievement_progress','guild_members',
  'withdrawal_requests','deposit_requests','transactions',
  'slot_spins','empire_founding_seats'
]::text[]) AS t;

BEGIN;

-- ---------- ENUM ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 헬퍼: 컬럼-aware 정책 생성기 ----------
CREATE OR REPLACE FUNCTION pg_temp.ensure_self_select_policy(_tbl text, _pol text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=_tbl AND column_name='user_id'
  ) THEN
    RAISE NOTICE 'SKIP policy %.%: user_id column missing', _tbl, _pol;
    RETURN;
  END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _pol, _tbl);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = user_id)', _pol, _tbl);
END $$;

-- ---------- user_roles ----------
CREATE TABLE IF NOT EXISTS public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS role       public.app_role,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_role_uniq UNIQUE (user_id, role);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
SELECT pg_temp.ensure_self_select_policy('user_roles','ur_self_read');

-- ---------- has_role (user_roles 보정 이후) ----------
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (id uuid PRIMARY KEY);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname          text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_date        date,
  ADD COLUMN IF NOT EXISTS is_adult          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier              text    NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS created_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "p_self_rw" ON public.profiles;
CREATE POLICY "p_self_rw" ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- wallet_balances ----------
CREATE TABLE IF NOT EXISTS public.wallet_balances (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.wallet_balances
  ADD COLUMN IF NOT EXISTS user_id              uuid,
  ADD COLUMN IF NOT EXISTS total_balance        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_balance    numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_balance      numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_balance       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_share_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS today_earned         numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_earned       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reset_date      date    NOT NULL DEFAULT current_date;
SELECT pg_temp.ensure_self_select_policy('wallet_balances','wb_self_read');

-- ---------- platform_kill_switches ----------
CREATE TABLE IF NOT EXISTS public.platform_kill_switches (key text PRIMARY KEY);
ALTER TABLE public.platform_kill_switches
  ADD COLUMN IF NOT EXISTS enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reason     text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.platform_kill_switches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pks_read_all" ON public.platform_kill_switches;
CREATE POLICY "pks_read_all" ON public.platform_kill_switches FOR SELECT USING (true);
INSERT INTO public.platform_kill_switches(key, enabled) VALUES
  ('trading_halt', false),('withdrawals_halt', false),
  ('signup_halt', false),('maintenance_mode', false),('degrade_mode', false)
ON CONFLICT (key) DO NOTHING;

-- ---------- imperial_kill_switches ----------
CREATE TABLE IF NOT EXISTS public.imperial_kill_switches (key text PRIMARY KEY);
ALTER TABLE public.imperial_kill_switches
  ADD COLUMN IF NOT EXISTS enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reason     text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.imperial_kill_switches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iks_read_all" ON public.imperial_kill_switches;
CREATE POLICY "iks_read_all" ON public.imperial_kill_switches FOR SELECT USING (true);
INSERT INTO public.imperial_kill_switches(key, enabled) VALUES
  ('imperial_betting', false),('imperial_flywheel', false),
  ('imperial_withdrawal', false),('imperial_burn', false),('imperial_nft_mint', false)
ON CONFLICT (key) DO NOTHING;

-- ---------- account_freezes + my_active_freeze ----------
CREATE TABLE IF NOT EXISTS public.account_freezes (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.account_freezes
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS reason     text,
  ADD COLUMN IF NOT EXISTS until_at   timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
SELECT pg_temp.ensure_self_select_policy('account_freezes','af_self_read');

DROP VIEW IF EXISTS public.my_active_freeze;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='account_freezes' AND column_name='user_id') THEN
    EXECUTE $v$
      CREATE VIEW public.my_active_freeze AS
        SELECT * FROM public.account_freezes
        WHERE user_id = auth.uid() AND until_at > now()
        ORDER BY until_at DESC LIMIT 1
    $v$;
  ELSE
    RAISE NOTICE 'SKIP my_active_freeze view: account_freezes.user_id missing';
  END IF;
END $$;

-- ---------- achievements ----------
CREATE TABLE IF NOT EXISTS public.achievement_catalog (code text PRIMARY KEY);
ALTER TABLE public.achievement_catalog
  ADD COLUMN IF NOT EXISTS title       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.achievement_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ac_read_all" ON public.achievement_catalog;
CREATE POLICY "ac_read_all" ON public.achievement_catalog FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_achievements (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS user_id     uuid,
  ADD COLUMN IF NOT EXISTS code        text,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
  ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_code_uniq UNIQUE (user_id, code);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
SELECT pg_temp.ensure_self_select_policy('user_achievements','ua_self');

CREATE TABLE IF NOT EXISTS public.user_achievement_progress (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.user_achievement_progress
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS code       text,
  ADD COLUMN IF NOT EXISTS value      numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
  ALTER TABLE public.user_achievement_progress ADD CONSTRAINT user_achievement_progress_user_code_uniq UNIQUE (user_id, code);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
SELECT pg_temp.ensure_self_select_policy('user_achievement_progress','uap_self');

DROP FUNCTION IF EXISTS public.heck_achievements();
CREATE FUNCTION public.heck_achievements()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('code', code)), '[]'::jsonb)
  FROM public.user_achievements WHERE user_id = auth.uid()
$$;

-- ---------- guild ----------
CREATE TABLE IF NOT EXISTS public.guild_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.guild_members
  ADD COLUMN IF NOT EXISTS user_id   uuid,
  ADD COLUMN IF NOT EXISTS guild_id  uuid,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
  ALTER TABLE public.guild_members ADD CONSTRAINT guild_members_user_guild_uniq UNIQUE (user_id, guild_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
SELECT pg_temp.ensure_self_select_policy('guild_members','gm_self');

CREATE TABLE IF NOT EXISTS public.guild_rankings (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.guild_rankings
  ADD COLUMN IF NOT EXISTS guild_id   uuid,
  ADD COLUMN IF NOT EXISTS rank       int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score      numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_start date    NOT NULL DEFAULT current_date;
ALTER TABLE public.guild_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gr_read_all" ON public.guild_rankings;
CREATE POLICY "gr_read_all" ON public.guild_rankings FOR SELECT USING (true);

-- ---------- withdrawals / deposits / transactions ----------
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS user_id          uuid,
  ADD COLUMN IF NOT EXISTS amount           numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS method           text    NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS status           text    NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS priority         smallint NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS tier_at_request  text    NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS tx_code          text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS process_by       timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason  text,
  ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now();
SELECT pg_temp.ensure_self_select_policy('withdrawal_requests','wr_self');

CREATE TABLE IF NOT EXISTS public.deposit_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS amount     numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS method     text    NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS status     text    NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
SELECT pg_temp.ensure_self_select_policy('deposit_requests','dr_self');

CREATE TABLE IF NOT EXISTS public.transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS kind       text    NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS amount     numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
SELECT pg_temp.ensure_self_select_policy('transactions','tx_self');

-- ---------- slots / jackpot ----------
CREATE TABLE IF NOT EXISTS public.slot_spins (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.slot_spins
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS game       text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bet        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
SELECT pg_temp.ensure_self_select_policy('slot_spins','ss_self');

CREATE TABLE IF NOT EXISTS public.jackpot_pools (id text PRIMARY KEY);
ALTER TABLE public.jackpot_pools
  ADD COLUMN IF NOT EXISTS amount     numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.jackpot_pools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jp_read_all" ON public.jackpot_pools;
CREATE POLICY "jp_read_all" ON public.jackpot_pools FOR SELECT USING (true);

DROP FUNCTION IF EXISTS public.get_slot_leaderboard(text, int);
CREATE FUNCTION public.get_slot_leaderboard(_game text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS TABLE (user_id uuid, total_win numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, SUM(win) AS total_win
  FROM public.slot_spins
  WHERE _game IS NULL OR game = _game
  GROUP BY user_id ORDER BY total_win DESC LIMIT _limit
$$;

-- ---------- empire founding seats ----------
CREATE TABLE IF NOT EXISTS public.empire_founding_seats (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.empire_founding_seats
  ADD COLUMN IF NOT EXISTS user_id    uuid,
  ADD COLUMN IF NOT EXISTS seat_no    int,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
  ALTER TABLE public.empire_founding_seats ADD CONSTRAINT empire_founding_seats_seat_no_uniq UNIQUE (seat_no);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='empire_founding_seats' AND column_name='user_id') THEN
    EXECUTE 'ALTER TABLE public.empire_founding_seats ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "efs_owner" ON public.empire_founding_seats';
    EXECUTE 'CREATE POLICY "efs_owner" ON public.empire_founding_seats FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),''admin''))';
  ELSE
    RAISE NOTICE 'SKIP efs_owner policy: empire_founding_seats.user_id missing';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_empire_seats_remaining();
CREATE FUNCTION public.get_empire_seats_remaining()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, 100 - COUNT(*)::int) FROM public.empire_founding_seats WHERE user_id IS NOT NULL
$$;

-- ---------- whale strikes / public hot RPCs ----------
DROP FUNCTION IF EXISTS public.get_whale_strikes_24h(int);
CREATE FUNCTION public.get_whale_strikes_24h(_limit int DEFAULT 30)
RETURNS TABLE (kind text, masked_nick text, amount numeric, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ''::text, ''::text, 0::numeric, now() WHERE false
$$;

DROP FUNCTION IF EXISTS public.get_recent_payouts_100();
CREATE FUNCTION public.get_recent_payouts_100()
RETURNS TABLE (masked_nick text, amount numeric, completed_at timestamptz, minutes_taken int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ''::text, 0::numeric, now(), 0 WHERE false
$$;

DROP FUNCTION IF EXISTS public.get_world_domination_stats();
CREATE FUNCTION public.get_world_domination_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT '{"users":0,"volume":0,"countries":0}'::jsonb
$$;

DROP FUNCTION IF EXISTS public.get_live_activity_60s();
CREATE FUNCTION public.get_live_activity_60s()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT '[]'::jsonb
$$;

COMMIT;

-- ---------- 자가 검증 (트랜잭션 밖) ----------
-- 빠진 게 있으면 행 출력됨. 0행이어야 정상.
SELECT 'MISSING user_id COLUMN' AS issue, t AS tablename
FROM unnest(ARRAY[
  'user_roles','wallet_balances','account_freezes',
  'user_achievements','user_achievement_progress','guild_members',
  'withdrawal_requests','deposit_requests','transactions',
  'slot_spins','empire_founding_seats'
]::text[]) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name = t AND column_name='user_id'
);

-- =====================================================================
-- DONE. 다음: docs/independence/WINDOWS_RUNBOOK_KO.md 따라 FULL CLONE 진행
-- =====================================================================

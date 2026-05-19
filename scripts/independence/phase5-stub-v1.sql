-- =====================================================================
-- Phase 5 STUB v1 — 콘솔 404/400 노이즈 차단용 최소 객체
-- 대상: 독립 백엔드 wyhhdyrvqtoejvusnhva ONLY
-- 관리형 ketlqzfaplppmupaiwft 에는 절대 실행하지 말 것 (READ-ONLY)
--
-- 적용 방법:
--   1) https://supabase.com/dashboard/project/wyhhdyrvqtoejvusnhva/sql/new
--   2) 본 파일 전체 복사 → 붙여넣기 → Run
--   3) 에러 없이 "Success. No rows returned" 나오면 OK
--
-- 특징:
--   - 전부 IF NOT EXISTS / OR REPLACE (idempotent)
--   - 진짜 FULL CLONE(supabase db push) 시 ALTER 로 흡수되어 충돌 없음
--   - 최소 컬럼 + 최소 RLS 만 부여 (운영 의도 아님, 노이즈 차단 목적)
-- =====================================================================

BEGIN;

-- ---------- ENUM ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ---------- user_roles ----------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ur_self_read" ON public.user_roles;
CREATE POLICY "ur_self_read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  nickname text NOT NULL DEFAULT '',
  birth_date date,
  is_adult boolean NOT NULL DEFAULT true,
  profile_completed boolean NOT NULL DEFAULT false,
  tier text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "p_self_rw" ON public.profiles;
CREATE POLICY "p_self_rw" ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- wallet_balances ----------
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  user_id uuid PRIMARY KEY,
  total_balance numeric NOT NULL DEFAULT 0,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  locked_balance numeric NOT NULL DEFAULT 0,
  profit_share_balance numeric NOT NULL DEFAULT 0,
  today_earned numeric NOT NULL DEFAULT 0,
  monthly_earned numeric NOT NULL DEFAULT 0,
  last_reset_date date NOT NULL DEFAULT current_date
);
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wb_self_read" ON public.wallet_balances;
CREATE POLICY "wb_self_read" ON public.wallet_balances FOR SELECT USING (auth.uid() = user_id);

-- ---------- platform_kill_switches ----------
CREATE TABLE IF NOT EXISTS public.platform_kill_switches (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_kill_switches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pks_read_all" ON public.platform_kill_switches;
CREATE POLICY "pks_read_all" ON public.platform_kill_switches FOR SELECT USING (true);
INSERT INTO public.platform_kill_switches(key, enabled) VALUES
  ('trading_halt', false),('withdrawals_halt', false),
  ('signup_halt', false),('maintenance_mode', false),('degrade_mode', false)
ON CONFLICT (key) DO NOTHING;

-- ---------- imperial_kill_switches ----------
CREATE TABLE IF NOT EXISTS public.imperial_kill_switches (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imperial_kill_switches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iks_read_all" ON public.imperial_kill_switches;
CREATE POLICY "iks_read_all" ON public.imperial_kill_switches FOR SELECT USING (true);
INSERT INTO public.imperial_kill_switches(key, enabled) VALUES
  ('imperial_betting', false),('imperial_flywheel', false),
  ('imperial_withdrawal', false),('imperial_burn', false),('imperial_nft_mint', false)
ON CONFLICT (key) DO NOTHING;

-- ---------- account_freezes + my_active_freeze view ----------
CREATE TABLE IF NOT EXISTS public.account_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text,
  until_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_freezes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "af_self_read" ON public.account_freezes;
CREATE POLICY "af_self_read" ON public.account_freezes FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.my_active_freeze AS
  SELECT * FROM public.account_freezes
  WHERE user_id = auth.uid() AND until_at > now()
  ORDER BY until_at DESC LIMIT 1;

-- ---------- achievements (heck_achievements 포함) ----------
CREATE TABLE IF NOT EXISTS public.achievement_catalog (
  code text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievement_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ac_read_all" ON public.achievement_catalog;
CREATE POLICY "ac_read_all" ON public.achievement_catalog FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ua_self" ON public.user_achievements;
CREATE POLICY "ua_self" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_achievement_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
ALTER TABLE public.user_achievement_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uap_self" ON public.user_achievement_progress;
CREATE POLICY "uap_self" ON public.user_achievement_progress FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.heck_achievements()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('code', code)), '[]'::jsonb)
  FROM public.user_achievements WHERE user_id = auth.uid()
$$;

-- ---------- guild ----------
CREATE TABLE IF NOT EXISTS public.guild_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  guild_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, guild_id)
);
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_self" ON public.guild_members;
CREATE POLICY "gm_self" ON public.guild_members FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.guild_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL,
  rank int NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  week_start date NOT NULL DEFAULT current_date
);
ALTER TABLE public.guild_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gr_read_all" ON public.guild_rankings;
CREATE POLICY "gr_read_all" ON public.guild_rankings FOR SELECT USING (true);

-- ---------- withdrawals / deposits / transactions ----------
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'bank',
  status text NOT NULL DEFAULT 'pending',
  priority smallint NOT NULL DEFAULT 100,
  tier_at_request text NOT NULL DEFAULT 'normal',
  tx_code text NOT NULL DEFAULT '',
  process_by timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  approved_at timestamptz,
  completed_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wr_self" ON public.withdrawal_requests;
CREATE POLICY "wr_self" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'bank',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dr_self" ON public.deposit_requests;
CREATE POLICY "dr_self" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  amount numeric NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tx_self" ON public.transactions;
CREATE POLICY "tx_self" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- ---------- slots / jackpot ----------
CREATE TABLE IF NOT EXISTS public.slot_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game text NOT NULL DEFAULT '',
  bet numeric NOT NULL DEFAULT 0,
  win numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slot_spins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ss_self" ON public.slot_spins;
CREATE POLICY "ss_self" ON public.slot_spins FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.jackpot_pools (
  id text PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jackpot_pools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jp_read_all" ON public.jackpot_pools;
CREATE POLICY "jp_read_all" ON public.jackpot_pools FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.get_slot_leaderboard(_game text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS TABLE (user_id uuid, total_win numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, SUM(win) AS total_win
  FROM public.slot_spins
  WHERE _game IS NULL OR game = _game
  GROUP BY user_id ORDER BY total_win DESC LIMIT _limit
$$;

-- ---------- empire founding seats ----------
CREATE TABLE IF NOT EXISTS public.empire_founding_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  seat_no int NOT NULL UNIQUE,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.empire_founding_seats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "efs_owner" ON public.empire_founding_seats;
CREATE POLICY "efs_owner" ON public.empire_founding_seats FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.get_empire_seats_remaining()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, 100 - COUNT(*)::int) FROM public.empire_founding_seats WHERE user_id IS NOT NULL
$$;

-- ---------- whale strikes (콘솔 hot path) ----------
CREATE OR REPLACE FUNCTION public.get_whale_strikes_24h(_limit int DEFAULT 30)
RETURNS TABLE (kind text, masked_nick text, amount numeric, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ''::text, ''::text, 0::numeric, now() WHERE false
$$;

CREATE OR REPLACE FUNCTION public.get_recent_payouts_100()
RETURNS TABLE (masked_nick text, amount numeric, completed_at timestamptz, minutes_taken int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ''::text, 0::numeric, now(), 0 WHERE false
$$;

CREATE OR REPLACE FUNCTION public.get_world_domination_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT '{"users":0,"volume":0,"countries":0}'::jsonb
$$;

CREATE OR REPLACE FUNCTION public.get_live_activity_60s()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT '[]'::jsonb
$$;

COMMIT;

-- =====================================================================
-- DONE. 다음:
--   docs/independence/WINDOWS_RUNBOOK_KO.md 따라 FULL CLONE 진행
-- =====================================================================

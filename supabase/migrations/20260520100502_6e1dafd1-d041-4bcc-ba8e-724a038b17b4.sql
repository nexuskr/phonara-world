-- 1) imperial_get_onboarding_state 401 fix
GRANT EXECUTE ON FUNCTION public.imperial_get_onboarding_state() TO anon, authenticated;

-- 2) withdrawal_status enum 'paid'
ALTER TYPE public.withdrawal_status ADD VALUE IF NOT EXISTS 'paid';

-- 3) kill_switches reason cleanup
UPDATE public.platform_kill_switches
   SET reason = CASE WHEN enabled THEN '활성화 (차단 ON)' ELSE '비활성화 (정상)' END
 WHERE key IN ('phon_betting','phon_staking','phon_swap','phon_swap_in','phon_swap_out');
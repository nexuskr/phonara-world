-- Tighten overly broad SELECT policies on tables exposing user_id + financial data.
-- All public leaderboard/social-proof UI reads via SECURITY DEFINER RPCs that return
-- masked nicknames only (e.g. get_whale_leaderboard), so removing the broad
-- SELECT policies does not break the UI.

-- 1) daily_whale_leaderboard: was readable by every authenticated user.
DROP POLICY IF EXISTS dwl_authenticated_read ON public.daily_whale_leaderboard;
CREATE POLICY dwl_owner_read
  ON public.daily_whale_leaderboard
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 2) slot_tournament_payouts: was readable by anon (public role).
DROP POLICY IF EXISTS slot_tournament_payouts_public_read ON public.slot_tournament_payouts;
CREATE POLICY slot_tournament_payouts_owner_read
  ON public.slot_tournament_payouts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 3) war_entries: was readable by every authenticated user, exposing user_id + display_name.
DROP POLICY IF EXISTS war_entries_authenticated_select ON public.war_entries;
CREATE POLICY war_entries_owner_read
  ON public.war_entries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 4) apex_cup_entries: had a public-role SELECT exposing user_id + entry_fee_phon.
DROP POLICY IF EXISTS apex_cup_entries_public_leaderboard ON public.apex_cup_entries;
-- Existing apex_cup_entries_self_read (owner OR admin) remains.

-- 5) Two public views were missing security_invoker=on -> treated as SECURITY DEFINER.
ALTER VIEW public.imperial_pf_public SET (security_invoker = on);
ALTER VIEW public.weekly_referral_leaderboard SET (security_invoker = on);
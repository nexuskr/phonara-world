-- 1. insurance_fund_log: remove the all-authenticated read policy, keep admin-only.
DROP POLICY IF EXISTS ifl_public_read ON public.insurance_fund_log;

-- 2. jackpot_settlements: restrict to winner + admin
DROP POLICY IF EXISTS js_public_read ON public.jackpot_settlements;
CREATE POLICY js_winner_or_admin_read
  ON public.jackpot_settlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = winner_id OR public.has_role(auth.uid(), 'admin'));

-- 3. trust_snapshots: only authenticated users
DROP POLICY IF EXISTS ts_public_read ON public.trust_snapshots;
CREATE POLICY ts_authenticated_read
  ON public.trust_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. viral_settings: only authenticated users
DROP POLICY IF EXISTS vs_public_read ON public.viral_settings;
CREATE POLICY vs_authenticated_read
  ON public.viral_settings
  FOR SELECT
  TO authenticated
  USING (true);
-- Add owner-scoped SELECT policies to satisfy RLS-enabled-no-policy linter.
-- Writes remain restricted to SECURITY DEFINER RPCs (service_role bypasses RLS).
-- No INSERT/UPDATE/DELETE policies for regular users — they must go through RPCs.

CREATE POLICY "woc_owner_select"
  ON public.withdraw_otp_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wac_owner_select"
  ON public.webauthn_challenges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
-- 1) war_entries: restrict public SELECT to authenticated users
DROP POLICY IF EXISTS war_entries_public_select ON public.war_entries;
CREATE POLICY war_entries_authenticated_select
  ON public.war_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) cash_loop_sessions: drop the "user_id IS NULL" public branch
DROP POLICY IF EXISTS cls_select_own ON public.cash_loop_sessions;
CREATE POLICY cls_select_own
  ON public.cash_loop_sessions
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

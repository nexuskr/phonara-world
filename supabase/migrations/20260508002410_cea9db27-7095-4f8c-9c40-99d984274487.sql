-- Founding seats: row-readable by authed (for realtime counter), but hide claimed_by/purchase_id
DROP POLICY IF EXISTS efs_self_or_admin_select ON public.empire_founding_seats;
CREATE POLICY efs_authed_read ON public.empire_founding_seats
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT ON public.empire_founding_seats FROM authenticated, anon;
GRANT SELECT (seat_no, claimed_at) ON public.empire_founding_seats TO authenticated;

-- Admins still need full read; allow via separate policy on the table for the admin role check.
-- Grant full column access to service_role (already implicit) and use a permissive admin policy + grants.
-- Since column grants are role-level and admin check is row-level, we re-grant all columns to authenticated
-- only when caller is admin via a SECURITY DEFINER helper view:
CREATE OR REPLACE VIEW public.empire_founding_seats_admin
WITH (security_invoker = true) AS
SELECT * FROM public.empire_founding_seats
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
GRANT SELECT ON public.empire_founding_seats_admin TO authenticated;
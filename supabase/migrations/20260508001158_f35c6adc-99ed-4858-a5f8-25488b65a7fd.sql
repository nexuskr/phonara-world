-- 1) chat_messages: hide user_id + metadata from anon.
DROP POLICY IF EXISTS "chat read" ON public.chat_messages;
CREATE POLICY chat_read_authed ON public.chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.chat_messages_public
WITH (security_invoker = true) AS
SELECT id, nickname, message, kind, created_at
FROM public.chat_messages;
GRANT SELECT ON public.chat_messages_public TO anon, authenticated;

-- 2) empire_founding_seats: hide claimed_by/purchase_id from anon.
DROP POLICY IF EXISTS efs_public_read ON public.empire_founding_seats;
CREATE POLICY efs_authed_read ON public.empire_founding_seats
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.empire_founding_seats_public
WITH (security_invoker = true) AS
SELECT seat_no, (claimed_by IS NOT NULL) AS is_claimed, claimed_at
FROM public.empire_founding_seats;
GRANT SELECT ON public.empire_founding_seats_public TO anon, authenticated;

-- 3) error_logs: anon must use the truncating RPC.
DROP POLICY IF EXISTS el_self_insert ON public.error_logs;
CREATE POLICY el_self_insert_authed ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
REVOKE INSERT ON TABLE public.error_logs FROM anon;

-- 4) receipts bucket: no end-user UPDATEs.
DROP POLICY IF EXISTS receipts_no_user_update ON storage.objects;
CREATE POLICY receipts_no_user_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id <> 'receipts')
  WITH CHECK (bucket_id <> 'receipts');

-- 5) Realtime channels require sign-in.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rt_authed_only ON realtime.messages;
CREATE POLICY rt_authed_only ON realtime.messages
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- 6) Pin search_path on email helper functions.
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
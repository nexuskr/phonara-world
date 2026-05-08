-- Revert to permissive row read so realtime postgres_changes works,
-- but enforce column-level privacy on user_id / metadata.
DROP POLICY IF EXISTS chat_self_or_admin_select ON public.chat_messages;
CREATE POLICY chat_read_authed ON public.chat_messages
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT ON public.chat_messages FROM authenticated, anon;
GRANT SELECT (id, message, kind, created_at, nickname) ON public.chat_messages TO authenticated;
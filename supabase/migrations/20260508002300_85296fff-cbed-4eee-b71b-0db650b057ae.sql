-- 1) chat_messages: restrict direct table SELECT to owner/admin
DROP POLICY IF EXISTS chat_read_authed ON public.chat_messages;
CREATE POLICY chat_self_or_admin_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) empire_founding_seats: restrict direct table SELECT to seat owner/admin
DROP POLICY IF EXISTS efs_authed_read ON public.empire_founding_seats;
CREATE POLICY efs_self_or_admin_select ON public.empire_founding_seats
  FOR SELECT TO authenticated
  USING (auth.uid() = claimed_by OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) realtime.messages: scope channel topic to owner / admins / known public topics
DROP POLICY IF EXISTS rt_authed_only ON realtime.messages;
CREATE POLICY rt_topic_scoped ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR realtime.topic() LIKE '%' || auth.uid()::text
      OR realtime.topic() LIKE '%' || auth.uid()::text || ':%'
      OR realtime.topic() = 'public:chat_messages'
      OR realtime.topic() LIKE 'empire-seats-%'
      OR EXISTS (
        SELECT 1 FROM public.support_threads st
        WHERE realtime.topic() = 'support:' || st.id::text
          AND st.user_id = auth.uid()
      )
    )
  );
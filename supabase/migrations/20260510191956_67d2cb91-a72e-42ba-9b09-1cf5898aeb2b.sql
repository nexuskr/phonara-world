
ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_sender_check;

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_sender_check
  CHECK (sender = ANY (ARRAY['user'::text, 'admin'::text, 'ai'::text, 'system'::text]));

-- Tighten user-insert policy to only allow 'user' sender (admin policy unchanged)
DROP POLICY IF EXISTS "sm_user_insert" ON public.support_messages;
CREATE POLICY "sm_user_insert" ON public.support_messages
  FOR INSERT
  WITH CHECK (
    (sender = 'user' AND auth.uid() = user_id)
    OR (sender = 'admin' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  );

-- Optional: track AI escalation flag on threads
ALTER TABLE public.support_threads
  ADD COLUMN IF NOT EXISTS ai_escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_last_category text;

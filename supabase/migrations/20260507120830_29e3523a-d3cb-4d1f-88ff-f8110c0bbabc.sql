
-- Support threads (one per user)
CREATE TABLE public.support_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_admin INT NOT NULL DEFAULT 0,
  unread_user INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "st_self_select" ON public.support_threads FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "st_self_insert" ON public.support_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "st_self_update" ON public.support_threads FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Support messages
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user','admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_thread ON public.support_messages(thread_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_self_select" ON public.support_messages FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sm_user_insert" ON public.support_messages FOR INSERT
  WITH CHECK (
    (sender = 'user' AND auth.uid() = user_id) OR
    (sender = 'admin' AND public.has_role(auth.uid(), 'admin'))
  );

-- Realtime
ALTER TABLE public.support_threads REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

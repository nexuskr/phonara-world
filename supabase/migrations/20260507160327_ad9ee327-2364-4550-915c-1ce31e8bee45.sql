ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
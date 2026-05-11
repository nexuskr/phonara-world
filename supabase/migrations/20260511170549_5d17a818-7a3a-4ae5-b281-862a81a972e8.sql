ALTER TABLE public.guild_chat_messages
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_nickname text,
  ADD COLUMN IF NOT EXISTS bot_emoji text;

-- relax NOT NULL on user_id for bot rows
ALTER TABLE public.guild_chat_messages ALTER COLUMN user_id DROP NOT NULL;

-- consistency: human rows must have user_id; bot rows must have bot_nickname
ALTER TABLE public.guild_chat_messages
  DROP CONSTRAINT IF EXISTS guild_chat_messages_sender_ck;
ALTER TABLE public.guild_chat_messages
  ADD CONSTRAINT guild_chat_messages_sender_ck CHECK (
    (is_bot = false AND user_id IS NOT NULL)
    OR (is_bot = true AND bot_nickname IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_guild_chat_isbot ON public.guild_chat_messages (guild_id, is_bot, created_at DESC);
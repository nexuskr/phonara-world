
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- 1. Knowledge base table
CREATE TABLE IF NOT EXISTS public.support_kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  content text NOT NULL,
  source_file_path text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kb_active_cat ON public.support_kb_articles(active, category);
CREATE INDEX IF NOT EXISTS idx_kb_content_trgm ON public.support_kb_articles USING gin (content public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kb_title_trgm ON public.support_kb_articles USING gin (title public.gin_trgm_ops);

ALTER TABLE public.support_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_read_authed" ON public.support_kb_articles
  FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "kb_admin_write" ON public.support_kb_articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.tg_kb_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS kb_set_updated_at ON public.support_kb_articles;
CREATE TRIGGER kb_set_updated_at BEFORE UPDATE ON public.support_kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.tg_kb_updated_at();

-- 2. Routing rules
CREATE TABLE IF NOT EXISTS public.support_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to uuid,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_routing_active_cat ON public.support_routing_rules(category) WHERE active;

ALTER TABLE public.support_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_admin_all" ON public.support_routing_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.support_routing_rules (category, priority, description) VALUES
  ('policy', 'urgent', '환불·분쟁·법적 문의'),
  ('wallet', 'high', '입출금·지갑 문제'),
  ('security', 'urgent', '계정 보안·해킹 의심'),
  ('account', 'high', '계정·KYC'),
  ('mission', 'normal', '미션·게이미피케이션'),
  ('technical', 'normal', '기술적 오류'),
  ('other', 'low', '기타 문의')
ON CONFLICT DO NOTHING;

-- 3. support_threads: status/priority/assignee
ALTER TABLE public.support_threads
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','reviewing','resolved','onhold')),
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_pii_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_st_status_priority ON public.support_threads(status, priority, last_message_at DESC);

-- 4. support_messages: PII masking flag
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS pii_masked boolean NOT NULL DEFAULT false;

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('support-kb', 'support-kb', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "skb_admin_read" ON storage.objects;
CREATE POLICY "skb_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-kb' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "skb_admin_write" ON storage.objects;
CREATE POLICY "skb_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-kb' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "skb_admin_update" ON storage.objects;
CREATE POLICY "skb_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'support-kb' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'support-kb' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "skb_admin_delete" ON storage.objects;
CREATE POLICY "skb_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'support-kb' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. KB search RPC
CREATE OR REPLACE FUNCTION public.search_support_kb(_query text, _limit int DEFAULT 5)
RETURNS TABLE (id uuid, title text, category text, content text, score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, a.title, a.category, a.content,
    GREATEST(public.similarity(a.title, _query), public.similarity(a.content, _query)) AS score
  FROM public.support_kb_articles a
  WHERE a.active = true
    AND (a.title ILIKE '%' || _query || '%'
         OR a.content ILIKE '%' || _query || '%'
         OR public.similarity(a.title, _query) > 0.15
         OR public.similarity(a.content, _query) > 0.10)
  ORDER BY score DESC NULLS LAST, a.updated_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 10));
$$;
REVOKE ALL ON FUNCTION public.search_support_kb(text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.search_support_kb(text, int) TO authenticated;

-- 7. Admin resolve RPC
CREATE OR REPLACE FUNCTION public.resolve_support_thread(_thread_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.support_threads
    SET status = 'resolved', resolved_at = now(), unread_admin = 0, ai_escalated = false
    WHERE id = _thread_id;
  IF _note IS NOT NULL AND length(trim(_note)) > 0 THEN
    INSERT INTO public.support_messages (thread_id, user_id, sender, message)
      SELECT _thread_id, t.user_id, 'system', _note FROM public.support_threads t WHERE t.id = _thread_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.resolve_support_thread(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_support_thread(uuid, text) TO authenticated;

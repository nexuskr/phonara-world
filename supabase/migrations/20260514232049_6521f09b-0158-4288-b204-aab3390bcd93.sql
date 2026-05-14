-- ============================================================
-- AS SEEN ON: Inbound press auto-capture + curation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inbound_press_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  hit_count BIGINT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sample_referrer TEXT,
  reviewed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_inbound_press_hits_last_seen ON public.inbound_press_hits(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_press_hits_count ON public.inbound_press_hits(hit_count DESC);

ALTER TABLE public.inbound_press_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "press_hits_admin_select" ON public.inbound_press_hits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.press_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  rank INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_press_sources_active_rank ON public.press_sources(active, rank);

ALTER TABLE public.press_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "press_sources_public_active_select" ON public.press_sources
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "press_sources_admin_all" ON public.press_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RPC: log_inbound_press(referrer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_inbound_press(_referrer TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host TEXT;
  v_self_hosts TEXT[] := ARRAY['phonara.world','www.phonara.world','phonetok.lovable.app','localhost','lovable.app','lovableproject.com'];
BEGIN
  IF _referrer IS NULL OR length(_referrer) < 8 THEN
    RETURN;
  END IF;

  -- Extract host
  v_host := lower(regexp_replace(_referrer, '^https?://([^/]+).*$', '\1'));
  v_host := regexp_replace(v_host, '^www\.', '');

  IF v_host = '' OR v_host IS NULL THEN
    RETURN;
  END IF;

  -- Skip self/internal hosts
  IF v_host = ANY(v_self_hosts) OR v_host LIKE '%.lovable.app' OR v_host LIKE '%.lovableproject.com' THEN
    RETURN;
  END IF;

  INSERT INTO public.inbound_press_hits(domain, sample_referrer)
  VALUES (v_host, _referrer)
  ON CONFLICT (domain) DO UPDATE
    SET hit_count = public.inbound_press_hits.hit_count + 1,
        last_seen_at = now();
END;
$$;

-- ============================================================
-- RPC: get_active_press_sources() (public)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_press_sources()
RETURNS TABLE(domain TEXT, display_name TEXT, logo_url TEXT, rank INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT domain, display_name, logo_url, rank
  FROM public.press_sources
  WHERE active = true
  ORDER BY rank ASC, display_name ASC;
$$;

-- ============================================================
-- Admin RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_inbound_hits(_limit INT DEFAULT 100, _only_unreviewed BOOLEAN DEFAULT false)
RETURNS TABLE(id UUID, domain TEXT, hit_count BIGINT, first_seen_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ, sample_referrer TEXT, reviewed BOOLEAN, already_curated BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  RETURN QUERY
  SELECT h.id, h.domain, h.hit_count, h.first_seen_at, h.last_seen_at, h.sample_referrer, h.reviewed,
         EXISTS(SELECT 1 FROM public.press_sources p WHERE p.domain = h.domain) AS already_curated
  FROM public.inbound_press_hits h
  WHERE (_only_unreviewed = false OR h.reviewed = false)
  ORDER BY h.hit_count DESC, h.last_seen_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_press_source(
  _domain TEXT,
  _display_name TEXT,
  _logo_url TEXT DEFAULT NULL,
  _rank INT DEFAULT 100
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  INSERT INTO public.press_sources(domain, display_name, logo_url, rank, active)
  VALUES (lower(_domain), _display_name, _logo_url, _rank, true)
  ON CONFLICT (domain) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        logo_url = COALESCE(EXCLUDED.logo_url, public.press_sources.logo_url),
        rank = EXCLUDED.rank,
        active = true,
        updated_at = now()
  RETURNING id INTO v_id;

  UPDATE public.inbound_press_hits SET reviewed = true WHERE domain = lower(_domain);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_press_source(_id UUID, _active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  UPDATE public.press_sources SET active = _active, updated_at = now() WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dismiss_inbound_hit(_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  UPDATE public.inbound_press_hits SET reviewed = true WHERE id = _id;
END;
$$;

-- ============================================================
-- Permission baseline registration
-- ============================================================
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('log_inbound_press', 'text', ARRAY['anon','authenticated','service_role'], 'public_telemetry', 'Logs inbound referrer domain'),
  ('get_active_press_sources', '', ARRAY['anon','authenticated','service_role'], 'public_marketing', 'AS SEEN ON list'),
  ('admin_list_inbound_hits', 'integer, boolean', ARRAY['authenticated','service_role'], 'admin_press', 'List inbound press candidates'),
  ('admin_approve_press_source', 'text, text, text, integer', ARRAY['authenticated','service_role'], 'admin_press', 'Curate press source'),
  ('admin_toggle_press_source', 'uuid, boolean', ARRAY['authenticated','service_role'], 'admin_press', 'Activate/deactivate press source'),
  ('admin_dismiss_inbound_hit', 'uuid', ARRAY['authenticated','service_role'], 'admin_press', 'Dismiss inbound hit candidate')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note;
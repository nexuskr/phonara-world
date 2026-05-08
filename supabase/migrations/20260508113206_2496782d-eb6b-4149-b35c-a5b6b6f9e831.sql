-- 1) Anonymous click dedupe / rate-limit table
CREATE TABLE IF NOT EXISTS public.ugc_redirect_clicks (
  slug TEXT NOT NULL,
  anon_id TEXT NOT NULL,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (slug, anon_id)
);

CREATE INDEX IF NOT EXISTS idx_ugc_redirect_clicks_last
  ON public.ugc_redirect_clicks(last_at DESC);

ALTER TABLE public.ugc_redirect_clicks ENABLE ROW LEVEL SECURITY;

-- Admin-only read; writes happen via SECURITY DEFINER RPC only.
DROP POLICY IF EXISTS urc_admin_read ON public.ugc_redirect_clicks;
CREATE POLICY urc_admin_read ON public.ugc_redirect_clicks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Tighten redirect tracker
CREATE OR REPLACE FUNCTION public.track_campaign_click(_slug text, _anon_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner uuid;
  v_url text;
  v_channel text;
  v_active boolean;
  v_anon text;
  v_last timestamptz;
  v_should_log boolean := true;
  ALLOWED_CHANNELS text[] := ARRAY['tiktok','instagram','threads','naver','youtube','kakao','etc'];
BEGIN
  -- Strict slug shape: 3-64 chars, lower alnum + dash/underscore only
  IF _slug IS NULL OR _slug !~ '^[a-z0-9][a-z0-9_-]{2,63}$' THEN
    RETURN NULL;
  END IF;

  SELECT user_id, target_url, channel, active
    INTO v_owner, v_url, v_channel, v_active
  FROM public.ugc_campaigns
  WHERE slug = _slug
    AND active = true
  LIMIT 1;

  IF v_owner IS NULL OR NOT v_active THEN
    RETURN NULL;
  END IF;

  -- Channel must be a known UGC channel
  IF NOT (v_channel = ANY (ALLOWED_CHANNELS)) THEN
    RETURN NULL;
  END IF;

  -- Stronger URL validation:
  --   - http(s):// only
  --   - no embedded credentials, CRLF, spaces, or javascript:/data:
  --   - reasonable length
  IF v_url IS NULL
     OR length(v_url) > 2048
     OR v_url !~* '^https?://[A-Za-z0-9._\-]+(:[0-9]{1,5})?(/.*)?$'
     OR v_url ~* '@'
     OR v_url ~ E'[\r\n\t ]'
     OR v_url ~* '^(javascript|data|file|vbscript):'
  THEN
    RETURN NULL;
  END IF;

  -- Per-visitor dedupe: same (slug, anon_id) within 1h => count once.
  v_anon := COALESCE(NULLIF(left(_anon_id, 64), ''), 'unknown');

  SELECT last_at INTO v_last
    FROM public.ugc_redirect_clicks
   WHERE slug = _slug AND anon_id = v_anon
   FOR UPDATE;

  IF v_last IS NOT NULL AND v_last > now() - interval '1 hour' THEN
    -- Within dedupe window: bump touch counter only, don't log a fresh click.
    UPDATE public.ugc_redirect_clicks
       SET last_at = now(), hit_count = hit_count + 1
     WHERE slug = _slug AND anon_id = v_anon;
    v_should_log := false;
  ELSE
    INSERT INTO public.ugc_redirect_clicks (slug, anon_id, last_at, hit_count)
    VALUES (_slug, v_anon, now(), 1)
    ON CONFLICT (slug, anon_id)
    DO UPDATE SET last_at = EXCLUDED.last_at, hit_count = public.ugc_redirect_clicks.hit_count + 1;
  END IF;

  IF v_should_log THEN
    UPDATE public.ugc_campaigns
       SET clicks_cached = clicks_cached + 1,
           updated_at = now()
     WHERE slug = _slug;

    INSERT INTO public.ugc_traffic_events
      (user_id, channel, event_date, clicks, campaign_slug, note)
    VALUES
      (v_owner, v_channel, (now() AT TIME ZONE 'Asia/Seoul')::date, 1, _slug, 'redirect:/c/' || _slug);
  END IF;

  RETURN v_url;
END;
$$;

-- Lock down execution: revoke from PUBLIC, grant only to anon + authenticated.
REVOKE ALL ON FUNCTION public.track_campaign_click(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_campaign_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_campaign_click(text, text) TO anon, authenticated;

-- Drop the older 1-arg variant so the surface is single & explicit.
DROP FUNCTION IF EXISTS public.track_campaign_click(text);

-- Update permission baseline
DELETE FROM public.function_permissions_baseline
 WHERE function_name = 'track_campaign_click';

INSERT INTO public.function_permissions_baseline
  (function_name, function_args, allowed_roles, category, note)
VALUES
  ('track_campaign_click', 'text, text', ARRAY['anon','authenticated'], 'ugc',
   'Public redirect tracker. SECURITY DEFINER, locked search_path, validates slug regex, http(s) target, channel enum, dedupes anon clicks per (slug,anon_id) within 1h.');

-- Secure redirect tracker RPC: callable by anon + authenticated.
-- Returns the target URL for a campaign slug and logs a click event
-- on behalf of the campaign owner (bypasses RLS via SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.track_campaign_click(_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_url text;
  v_channel text;
  v_active boolean;
BEGIN
  IF _slug IS NULL OR length(_slug) = 0 OR length(_slug) > 64 THEN
    RETURN NULL;
  END IF;

  SELECT user_id, target_url, channel, active
    INTO v_owner, v_url, v_channel, v_active
  FROM public.ugc_campaigns
  WHERE slug = _slug
  LIMIT 1;

  IF v_owner IS NULL OR NOT v_active THEN
    RETURN NULL;
  END IF;

  -- Allow only http(s) targets to prevent open-redirect to javascript:/data: URLs
  IF v_url !~* '^https?://' THEN
    RETURN NULL;
  END IF;

  -- Bump cached click counter
  UPDATE public.ugc_campaigns
     SET clicks_cached = clicks_cached + 1,
         updated_at = now()
   WHERE slug = _slug;

  -- Log click into traffic events for the campaign owner
  INSERT INTO public.ugc_traffic_events
    (user_id, channel, event_date, clicks, campaign_slug, note)
  VALUES
    (v_owner, v_channel, (now() AT TIME ZONE 'Asia/Seoul')::date, 1, _slug, 'redirect:/c/' || _slug);

  RETURN v_url;
END;
$$;

REVOKE ALL ON FUNCTION public.track_campaign_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_campaign_click(text) TO anon, authenticated;

-- Tighten ugc_campaigns SELECT: non-owners/admins can't see inactive rows even by chance
DROP POLICY IF EXISTS uc_self_select ON public.ugc_campaigns;
CREATE POLICY uc_self_select ON public.ugc_campaigns
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Defense in depth: prevent users from changing user_id / slug on update
DROP POLICY IF EXISTS uc_self_update ON public.ugc_campaigns;
CREATE POLICY uc_self_update ON public.ugc_campaigns
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Register in permission baseline (best-effort; ignore if table missing)
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES ('track_campaign_click', 'text', ARRAY['anon','authenticated'], 'ugc',
        'Public redirect tracker. SECURITY DEFINER, validates http(s) target and active campaign.')
ON CONFLICT DO NOTHING;

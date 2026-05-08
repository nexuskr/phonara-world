CREATE TABLE IF NOT EXISTS public.ugc_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL,
  label TEXT NOT NULL,
  target_url TEXT NOT NULL,
  code TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  clicks_cached INTEGER NOT NULL DEFAULT 0,
  conversions_cached INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_user ON public.ugc_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_campaigns_slug ON public.ugc_campaigns(slug);

ALTER TABLE public.ugc_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY uc_self_select ON public.ugc_campaigns
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY uc_self_insert ON public.ugc_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY uc_self_update ON public.ugc_campaigns
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY uc_self_delete ON public.ugc_campaigns
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.ugc_traffic_events
  ADD COLUMN IF NOT EXISTS campaign_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_ugc_events_campaign ON public.ugc_traffic_events(campaign_slug);
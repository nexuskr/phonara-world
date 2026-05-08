CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.ugc_traffic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('tiktok','instagram','threads','naver','youtube','kakao','etc')),
  event_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  signups integer NOT NULL DEFAULT 0 CHECK (signups >= 0),
  conversions integer NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  dm_sent integer NOT NULL DEFAULT 0 CHECK (dm_sent >= 0),
  dm_responded integer NOT NULL DEFAULT 0 CHECK (dm_responded >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ugc_traffic_user_date ON public.ugc_traffic_events (user_id, event_date DESC);
CREATE INDEX idx_ugc_traffic_channel_date ON public.ugc_traffic_events (channel, event_date DESC);

ALTER TABLE public.ugc_traffic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ugc_owner_select" ON public.ugc_traffic_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ugc_owner_insert" ON public.ugc_traffic_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ugc_owner_update" ON public.ugc_traffic_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ugc_owner_delete" ON public.ugc_traffic_events
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_ugc_traffic_updated_at
  BEFORE UPDATE ON public.ugc_traffic_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();